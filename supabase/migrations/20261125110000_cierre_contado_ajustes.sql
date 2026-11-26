-- Cuadre de caja: montos contados por el cajero y ajustes del cierre.
--
--  * cierrecaja: contado_efectivo, contado_tarjeta, contado_deposito,
--    contado_cheque, total_contado y total_ajustes.
--  * cierrecaja_concepto: conceptos de ajuste (Nota de credito, Entrada o
--    devolucion, Cambio de cheque, Gasto menor, Otro). Se pueden agregar
--    nuevos desde el modal de cierre.
--  * cierrecaja_ajuste: ajustes de cada cierre (concepto + valor).
--  * realizar_cierre_caja: si recibe el contado, valida en la misma
--    transaccion que contado + ajustes = cobrado y que el contado no sea mayor
--    que lo cobrado; guarda contado y ajustes junto con el cierre.

BEGIN;

ALTER TABLE myappdb.cierrecaja
  ADD COLUMN IF NOT EXISTS contado_efectivo numeric(12,2),
  ADD COLUMN IF NOT EXISTS contado_tarjeta  numeric(12,2),
  ADD COLUMN IF NOT EXISTS contado_deposito numeric(12,2),
  ADD COLUMN IF NOT EXISTS contado_cheque   numeric(12,2),
  ADD COLUMN IF NOT EXISTS total_contado    numeric(12,2),
  ADD COLUMN IF NOT EXISTS total_ajustes    numeric(12,2);

CREATE TABLE IF NOT EXISTS myappdb.cierrecaja_concepto (
  idconcepto  serial PRIMARY KEY,
  descripcion varchar(80) NOT NULL,
  activo      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  text
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_cierrecaja_concepto_desc
  ON myappdb.cierrecaja_concepto (upper(btrim(descripcion)));

INSERT INTO myappdb.cierrecaja_concepto (descripcion)
VALUES ('Nota de credito'), ('Entrada o devolucion'), ('Cambio de cheque'), ('Gasto menor'), ('Otro')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS myappdb.cierrecaja_ajuste (
  id          bigserial PRIMARY KEY,
  idcierre    integer NOT NULL,
  idconcepto  integer,
  concepto    varchar(80) NOT NULL,
  valor       numeric(12,2) NOT NULL CHECK (valor > 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cierrecaja_ajuste_cierre ON myappdb.cierrecaja_ajuste (idcierre);

GRANT SELECT, INSERT ON TABLE myappdb.cierrecaja_concepto TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE myappdb.cierrecaja_concepto_idconcepto_seq TO authenticated;
GRANT SELECT ON TABLE myappdb.cierrecaja_ajuste TO authenticated;

ALTER TABLE myappdb.cierrecaja_concepto ENABLE ROW LEVEL SECURITY;
ALTER TABLE myappdb.cierrecaja_ajuste ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cierrecaja_concepto_select ON myappdb.cierrecaja_concepto;
CREATE POLICY cierrecaja_concepto_select ON myappdb.cierrecaja_concepto
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS cierrecaja_concepto_insert ON myappdb.cierrecaja_concepto;
CREATE POLICY cierrecaja_concepto_insert ON myappdb.cierrecaja_concepto
FOR INSERT TO authenticated
WITH CHECK (
  app_private.is_root()
  OR app_private.has_permission('caja.cuadrecaja', 'cerrar_caja')
);

DROP POLICY IF EXISTS cierrecaja_ajuste_select ON myappdb.cierrecaja_ajuste;
CREATE POLICY cierrecaja_ajuste_select ON myappdb.cierrecaja_ajuste
FOR SELECT TO authenticated
USING (
  app_private.is_root()
  OR app_private.has_permission('caja.cuadrecaja', 'cerrar_caja')
);

CREATE OR REPLACE FUNCTION myappdb.realizar_cierre_caja(
  p_cierre jsonb,
  p_facturas_cobradas text[] DEFAULT '{}',
  p_facturas_pendientes jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = myappdb, public
AS $$
DECLARE
  v_suc integer := nullif(nullif(p_cierre->>'codsucursal', '')::integer, 0);
  v_cobradas text[];
  v_ocupadas text[];
  v_cierre myappdb.cierrecaja%ROWTYPE;
  v_marcadas integer := 0;
  v_pendientes integer := 0;
  v_hay_contado boolean := (p_cierre ? 'total_contado');
  v_cobrado numeric;
  v_contado numeric;
  v_ajustes numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING ERRCODE = '42501';
  END IF;

  IF v_suc IS NULL THEN
    RAISE EXCEPTION 'El cierre no tiene una sucursal valida.' USING ERRCODE = '22023';
  END IF;

  -- Permiso evaluado UNA vez (antes la RLS lo evaluaba por cada factura).
  IF NOT (
    coalesce(app_private.is_root(), false)
    OR (
      app_private.current_usuario_tenant_ok(NULL::text, v_suc::text)
      AND app_private.has_permission('caja.cuadrecaja', 'cerrar_caja', NULL::text, v_suc::text)
    )
  ) THEN
    RAISE EXCEPTION 'No tiene permiso para cerrar la caja de la sucursal %.', v_suc USING ERRCODE = '42501';
  END IF;

  -- Cuadre: contado + ajustes debe ser igual a lo cobrado, y no puede sobrar.
  IF v_hay_contado THEN
    v_cobrado := round(
      coalesce(nullif(p_cierre->>'tefectivo', '')::numeric, 0) +
      coalesce(nullif(p_cierre->>'ttarjeta', '')::numeric, 0) +
      coalesce(nullif(p_cierre->>'tdeposito', '')::numeric, 0) +
      coalesce(nullif(p_cierre->>'tcheque', '')::numeric, 0), 2);
    v_contado := round(coalesce(nullif(p_cierre->>'total_contado', '')::numeric, 0), 2);
    SELECT round(coalesce(sum(coalesce(nullif(a->>'valor', '')::numeric, 0)), 0), 2)
      INTO v_ajustes
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(p_cierre->'ajustes') = 'array' THEN p_cierre->'ajustes' ELSE '[]'::jsonb END
    ) a;

    IF v_contado > v_cobrado THEN
      RAISE EXCEPTION 'El contado (%) no puede ser mayor que lo cobrado (%).', v_contado, v_cobrado
        USING ERRCODE = 'P0001';
    END IF;
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(p_cierre->'ajustes') = 'array' THEN p_cierre->'ajustes' ELSE '[]'::jsonb END
      ) a
      WHERE coalesce(nullif(a->>'valor', '')::numeric, 0) <= 0
         OR btrim(coalesce(a->>'concepto', '')) = ''
    ) THEN
      RAISE EXCEPTION 'Cada ajuste debe tener un concepto y un valor mayor que cero.' USING ERRCODE = 'P0001';
    END IF;
    IF v_contado + v_ajustes <> v_cobrado THEN
      RAISE EXCEPTION 'El cuadre no coincide: contado % + ajustes % <> cobrado %.', v_contado, v_ajustes, v_cobrado
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  SELECT coalesce(array_agg(DISTINCT btrim(x)), '{}')
    INTO v_cobradas
  FROM unnest(coalesce(p_facturas_cobradas, '{}')) AS x
  WHERE btrim(coalesce(x, '')) <> '';

  -- Un solo cierre a la vez por sucursal. Un segundo intento espera aqui
  -- y luego detecta que las facturas ya fueron cerradas.
  PERFORM pg_advisory_xact_lock(hashtext('myappdb.cierrecaja'), v_suc);

  SELECT array_agg(f.fa_codfact::text ORDER BY f.fa_codfact)
    INTO v_ocupadas
  FROM myappdb.factura f
  WHERE f.fa_codfact = ANY (v_cobradas)
    AND f.fa_codsucu = v_suc
    AND NOT (f.fa_cierre IS NULL OR btrim(f.fa_cierre::text) IN ('', '0', 'N'));

  IF coalesce(cardinality(v_ocupadas), 0) > 0 THEN
    RAISE EXCEPTION 'Hay % factura(s) que ya pertenecen a otro cierre (por ejemplo %). Recargue la pantalla y vuelva a intentarlo.',
      cardinality(v_ocupadas), array_to_string(v_ocupadas[1:5], ', ')
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO myappdb.cierrecaja (
    feccierre, tefectivo, ttarjeta, tdeposito, totalcierre, tcheque,
    tcredito, tpendiente, factini, factfin, codsucursal, cajera, nota
  )
  VALUES (
    coalesce(nullif(p_cierre->>'feccierre', '')::date, current_date),
    coalesce(nullif(p_cierre->>'tefectivo', '')::numeric, 0),
    coalesce(nullif(p_cierre->>'ttarjeta', '')::numeric, 0),
    coalesce(nullif(p_cierre->>'tdeposito', '')::numeric, 0),
    coalesce(nullif(p_cierre->>'totalcierre', '')::numeric, 0),
    coalesce(nullif(p_cierre->>'tcheque', '')::numeric, 0),
    coalesce(nullif(p_cierre->>'tcredito', '')::numeric, 0),
    coalesce(nullif(p_cierre->>'tpendiente', '')::numeric, 0),
    nullif(p_cierre->>'factini', ''),
    nullif(p_cierre->>'factfin', ''),
    v_suc,
    nullif(p_cierre->>'cajera', ''),
    nullif(p_cierre->>'nota', '')
  )
  RETURNING * INTO v_cierre;

  IF v_hay_contado THEN
    UPDATE myappdb.cierrecaja
       SET contado_efectivo = round(coalesce(nullif(p_cierre->>'contado_efectivo', '')::numeric, 0), 2),
           contado_tarjeta  = round(coalesce(nullif(p_cierre->>'contado_tarjeta', '')::numeric, 0), 2),
           contado_deposito = round(coalesce(nullif(p_cierre->>'contado_deposito', '')::numeric, 0), 2),
           contado_cheque   = round(coalesce(nullif(p_cierre->>'contado_cheque', '')::numeric, 0), 2),
           total_contado    = v_contado,
           total_ajustes    = v_ajustes
     WHERE idcierre = v_cierre.idcierre
    RETURNING * INTO v_cierre;

    INSERT INTO myappdb.cierrecaja_ajuste (idcierre, idconcepto, concepto, valor)
    SELECT v_cierre.idcierre,
           nullif(a->>'idconcepto', '')::integer,
           left(btrim(a->>'concepto'), 80),
           round((a->>'valor')::numeric, 2)
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(p_cierre->'ajustes') = 'array' THEN p_cierre->'ajustes' ELSE '[]'::jsonb END
    ) a;
  END IF;

  IF cardinality(v_cobradas) > 0 THEN
    UPDATE myappdb.factura f
       SET fa_cierre = v_cierre.idcierre
     WHERE f.fa_codfact = ANY (v_cobradas)
       AND f.fa_codsucu = v_suc
       AND (f.fa_cierre IS NULL OR btrim(f.fa_cierre::text) IN ('', '0', 'N'))
       AND (f.fa_status IS NULL OR f.fa_status <> 'N');
    GET DIAGNOSTICS v_marcadas = ROW_COUNT;

    IF v_marcadas <> cardinality(v_cobradas) THEN
      -- La excepcion deshace tambien la cabecera del cierre.
      RAISE EXCEPTION 'Solo se pudieron cerrar % de % facturas cobradas. El cierre NO se guardo; recargue la pantalla y vuelva a intentarlo.',
        v_marcadas, cardinality(v_cobradas)
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF to_regclass('myappdb.cierrecaja_facturas_pendientes') IS NOT NULL
     AND jsonb_typeof(p_facturas_pendientes) = 'array'
     AND jsonb_array_length(p_facturas_pendientes) > 0 THEN
    INSERT INTO myappdb.cierrecaja_facturas_pendientes (
      idcierre, feccierre, codsucursal, fa_codfact, fa_fecfact,
      cliente, vendedor, tipo, forma_pago, estado, valor
    )
    SELECT
      v_cierre.idcierre,
      v_cierre.feccierre,
      v_suc,
      btrim(x.factura),
      x.fecha_factura,
      left(x.cliente, 255),
      left(x.vendedor, 255),
      left(x.tipo, 30),
      left(x.forma_pago, 100),
      left(x.estado, 30),
      coalesce(x.valor, 0)
    FROM jsonb_to_recordset(p_facturas_pendientes) AS x(
      factura text,
      fecha_factura date,
      cliente text,
      vendedor text,
      tipo text,
      forma_pago text,
      estado text,
      valor numeric
    )
    WHERE btrim(coalesce(x.factura, '')) <> ''
    ON CONFLICT (idcierre, fa_codfact) DO NOTHING;
    GET DIAGNOSTICS v_pendientes = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'cierre', to_jsonb(v_cierre),
    'marcadas', v_marcadas,
    'pendientes', v_pendientes
  );
END;
$$;

REVOKE ALL ON FUNCTION myappdb.realizar_cierre_caja(jsonb, text[], jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION myappdb.realizar_cierre_caja(jsonb, text[], jsonb) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
