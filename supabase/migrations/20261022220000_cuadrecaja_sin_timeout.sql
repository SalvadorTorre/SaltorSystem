-- Cuadre de caja sin "canceling statement due to statement timeout".
--
-- Con el usuario root funcionaba y con el usuario de caja no: para un usuario
-- normal, cada lectura y cada UPDATE sobre myappdb.factura pasa por las
-- politicas RLS, que llaman a current_usuario_tenant_ok(), has_any_permission()
-- y current_driver_has_invoice() por CADA factura revisada. La lista de
-- facturas pendientes de cierre recorre todas las facturas de la sucursal, y
-- con el volumen actual se pasa del tiempo limite.
--
-- 1) listar_facturas_pendientes_cierre: devuelve las facturas pendientes de
--    cierre de una sucursal validando el permiso UNA sola vez.
-- 2) realizar_cierre_caja pasa a SECURITY DEFINER, con el permiso
--    caja.cuadrecaja / cerrar_caja validado una vez por sucursal.

CREATE OR REPLACE FUNCTION myappdb.listar_facturas_pendientes_cierre(
  p_sucursal_id integer,
  p_empresa text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = myappdb, public
AS $$
DECLARE
  cu record;
  v_suc integer := nullif(p_sucursal_id, 0);
  v_empresa text := nullif(btrim(coalesce(p_empresa, '')), '');
  v_root boolean := false;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING ERRCODE = '42501';
  END IF;

  IF v_suc IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT * INTO cu FROM app_private.current_usuario() LIMIT 1;
  v_root := coalesce(app_private.is_root(), false);
  v_empresa := coalesce(v_empresa, nullif(btrim(coalesce(cu.cod_empre::text, '')), ''));

  IF v_empresa IS NULL AND NOT v_root THEN
    RETURN '[]'::jsonb;
  END IF;

  IF NOT (
    v_root
    OR (
      app_private.current_usuario_tenant_ok(v_empresa, v_suc::text)
      AND app_private.has_any_permission(
        '[
          {"recurso":"caja.cuadrecaja","accion":"ver"},
          {"recurso":"caja.cuadrecaja","accion":"cerrar_caja"},
          {"recurso":"caja.cobrofact","accion":"ver"},
          {"recurso":"facturacion.factura","accion":"ver"}
        ]'::jsonb,
        v_empresa,
        v_suc::text
      )
    )
  ) THEN
    RAISE EXCEPTION 'No tiene permiso para ver las facturas de la sucursal %.', v_suc USING ERRCODE = '42501';
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(b) ORDER BY b.fa_codfact), '[]'::jsonb)
    INTO v_result
  FROM (
    SELECT f.fa_codfact, f.fa_ncffact, f.fa_rncfact, f.fa_tiponcf, f.fa_fecfact,
           f.fa_valfact, f.fa_itbifact, f.fa_subfact, f.fa_desfact, f.fa_codclie,
           f.fa_nomclie, f.fa_codvend, f.fa_nomvend, f.fa_fpago, f.fa_codfpago,
           f.fa_tipopago, f.fa_status, f.fa_codsucu, f.fa_codempr, f.fa_cierre,
           f.fa_entrega, f.fa_impresa, f.fa_facturada
    FROM myappdb.factura f
    WHERE f.fa_codsucu = v_suc
      AND (v_empresa IS NULL OR f.fa_codempr = v_empresa)
      AND (f.fa_status IS NULL OR f.fa_status <> 'N')
      AND (f.fa_cierre IS NULL OR f.fa_cierre::text = '0')
  ) b;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION myappdb.listar_facturas_pendientes_cierre(integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION myappdb.listar_facturas_pendientes_cierre(integer, text) TO authenticated;

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

NOTIFY pgrst, 'reload schema';
