-- Cierre de caja atomico.
--
-- Problemas que corrige:
--  1. Cierres duplicados que se reparten las facturas. Antes el frontend
--     creaba el cierre (cierrecaja) y luego marcaba las facturas en pasos
--     separados. Si el marcado quedaba incompleto, el cierre ya estaba
--     guardado; al repetir la operacion se creaba otro cierre con las
--     facturas restantes. Dos cajeros (o dos pestanas) cerrando a la vez
--     tambien se repartian las facturas.
--  2. Facturas cobradas que se sumaban en los totales pero no quedaban en
--     el cierre: el marcado solo aceptaba fa_cierre IS NULL y fa_fpago = 'S',
--     mientras que la pantalla tambien considera pendientes de cierre las
--     facturas con fa_cierre '0', '' o 'N', y cobradas otros valores de
--     fa_fpago. Esas facturas se sumaban, no se marcaban y volvian a aparecer
--     (y a sumarse) en el cierre siguiente.
--
-- Esta funcion hace todo en una sola transaccion, con un bloqueo por
-- sucursal: o se guarda el cierre completo (cabecera + facturas cobradas
-- marcadas + foto de facturas a credito/pendientes), o no se guarda nada.

CREATE OR REPLACE FUNCTION myappdb.realizar_cierre_caja(
  p_cierre jsonb,
  p_facturas_cobradas text[] DEFAULT '{}',
  p_facturas_pendientes jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = myappdb, public
AS $$
DECLARE
  v_suc integer := nullif(nullif(p_cierre->>'codsucursal', '')::integer, 0);
  v_cobradas text[];
  v_ocupadas text[];
  v_cierre myappdb.cierrecaja%ROWTYPE;
  v_marcadas integer := 0;
  v_pendientes integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING ERRCODE = '42501';
  END IF;

  IF v_suc IS NULL THEN
    RAISE EXCEPTION 'El cierre no tiene una sucursal valida.' USING ERRCODE = '22023';
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
  WHERE f.fa_codfact::text = ANY (v_cobradas)
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

  IF cardinality(v_cobradas) > 0 THEN
    UPDATE myappdb.factura f
       SET fa_cierre = v_cierre.idcierre
     WHERE f.fa_codfact::text = ANY (v_cobradas)
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

NOTIFY pgrst, 'reload schema';
