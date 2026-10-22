-- Control de salida: cobrar_salidas_chofer v2 (corrige "canceling statement
-- due to statement timeout" al guardar el cobro).
--
-- La v1 era SECURITY INVOKER: cada UPDATE sobre detsalida, factura y salida
-- pasaba por las politicas RLS, que llaman a current_usuario_tenant_ok() y
-- has_any_permission() por CADA fila revisada. Ademas, las condiciones con
-- btrim(columna) no podian usar los indices, asi que se revisaban todas las
-- filas de detsalida y salida con la RLS en cada una.
--
-- Ahora la funcion es SECURITY DEFINER: valida los permisos UNA vez por
-- sucursal/empresa (misma regla que las politicas) y luego actualiza por
-- columnas indexadas, sin funciones sobre la columna.
--
-- Misma firma y mismo resultado que la v1.

CREATE INDEX IF NOT EXISTS idx_detsalida_codsalida_codfact
  ON myappdb.detsalida (codsalida, codfact);

CREATE OR REPLACE FUNCTION myappdb.cobrar_salidas_chofer(
  p_salidas jsonb,
  p_detalles jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = myappdb, public
AS $$
DECLARE
  v_salida jsonb;
  v_id integer;
  v_status text;
  v_codsalida text;
  v_idsucursal integer;
  v_ids integer[] := '{}';
  v_codsalidas text[] := '{}';
  v_sucursales integer[] := '{}';
  v_codfacts text[] := '{}';
  v_pagadas text[] := '{}';
  v_det jsonb;
  v_codfact text;
  v_det_codsalida text;
  v_pagado boolean;
  v_rows integer;
  v_total_det integer := 0;
  v_total_fact integer := 0;
  v_total_salidas integer := 0;
  v_sin_permiso text;
  v_faltantes text[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(p_salidas) <> 'array' OR jsonb_array_length(p_salidas) = 0 THEN
    RAISE EXCEPTION 'No se indicaron salidas para cobrar.' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p_detalles) <> 'array' OR jsonb_array_length(p_detalles) = 0 THEN
    RAISE EXCEPTION 'No se indicaron facturas para cobrar.' USING ERRCODE = '22023';
  END IF;

  -- 1) Bloquear y validar cada salida.
  FOR v_salida IN SELECT * FROM jsonb_array_elements(p_salidas) LOOP
    v_id := nullif(v_salida->>'id', '')::integer;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Salida sin id.' USING ERRCODE = '22023';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('myappdb.salida'), v_id);

    SELECT btrim(coalesce(s.status::text, '')), s.codsalida::text, s.idsucursal
      INTO v_status, v_codsalida, v_idsucursal
    FROM myappdb.salida s
    WHERE s.id = v_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'La salida % no existe.', v_id USING ERRCODE = 'P0001';
    END IF;

    IF upper(v_status) <> 'P' THEN
      RAISE EXCEPTION 'La salida % ya no esta pendiente (estado %). Recargue la pantalla.', v_codsalida, v_status
        USING ERRCODE = 'P0001';
    END IF;

    v_ids := v_ids || v_id;
    v_codsalidas := v_codsalidas || v_codsalida;
    IF v_idsucursal IS NOT NULL AND NOT (v_idsucursal = ANY (v_sucursales)) THEN
      v_sucursales := v_sucursales || v_idsucursal;
    END IF;
  END LOOP;

  -- 2) Permisos, una vez por sucursal de las salidas.
  SELECT string_agg(x::text, ', ')
    INTO v_sin_permiso
  FROM unnest(v_sucursales) AS x
  WHERE NOT (
    app_private.current_usuario_tenant_ok(NULL::text, x::text)
    AND app_private.has_any_permission(
      '[
        {"recurso":"caja.controlsalida","accion":"ver"},
        {"recurso":"almacen.salidafactura","accion":"editar"},
        {"recurso":"almacen.salidafactura","accion":"crear"}
      ]'::jsonb,
      NULL::text,
      x::text
    )
  );

  IF v_sin_permiso IS NOT NULL THEN
    RAISE EXCEPTION 'No tiene permiso para cobrar salidas de la sucursal %.', v_sin_permiso
      USING ERRCODE = '42501';
  END IF;

  -- 3) Validar el detalle y armar las listas de facturas.
  FOR v_det IN SELECT * FROM jsonb_array_elements(p_detalles) LOOP
    v_codfact := btrim(coalesce(v_det->>'codfact', ''));
    v_det_codsalida := btrim(coalesce(v_det->>'codsalida', ''));
    v_pagado := coalesce((v_det->>'pagado')::boolean, false);

    IF v_codfact = '' OR v_det_codsalida = '' THEN
      RAISE EXCEPTION 'Detalle sin factura o sin salida.' USING ERRCODE = '22023';
    END IF;

    IF NOT (v_det_codsalida = ANY (v_codsalidas)) THEN
      RAISE EXCEPTION 'La factura % pertenece a la salida %, que no se esta cobrando.', v_codfact, v_det_codsalida
        USING ERRCODE = 'P0001';
    END IF;

    UPDATE myappdb.detsalida d
       SET pagado = CASE WHEN v_pagado THEN 'S' ELSE 'N' END,
           entregada = 'S',
           status = 'C'
     WHERE d.codsalida = v_det_codsalida
       AND d.codfact = v_codfact;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
      RAISE EXCEPTION 'La factura % no esta en el detalle de la salida %.', v_codfact, v_det_codsalida
        USING ERRCODE = 'P0001';
    END IF;
    v_total_det := v_total_det + v_rows;

    v_codfacts := v_codfacts || v_codfact;
    IF v_pagado THEN
      v_pagadas := v_pagadas || v_codfact;
    END IF;
  END LOOP;

  -- 4) Facturas: deben existir todas.
  SELECT array_agg(c)
    INTO v_faltantes
  FROM unnest(v_codfacts) AS c
  WHERE NOT EXISTS (SELECT 1 FROM myappdb.factura f WHERE f.fa_codfact = c);

  IF coalesce(cardinality(v_faltantes), 0) > 0 THEN
    RAISE EXCEPTION 'No se encontraron las facturas: %.', array_to_string(v_faltantes[1:10], ', ')
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE myappdb.factura f
     SET fa_fpago = CASE WHEN f.fa_codfact = ANY (v_pagadas) THEN 'S' ELSE f.fa_fpago END,
         fa_entrega = 'S',
         fa_salida = 'C',
         idsalida = NULL
   WHERE f.fa_codfact = ANY (v_codfacts);
  GET DIAGNOSTICS v_total_fact = ROW_COUNT;

  -- 5) Cerrar las salidas. valpagado se recalcula desde el detalle.
  UPDATE myappdb.salida s
     SET status = 'C',
         valpagado = coalesce((
           SELECT sum(coalesce(d.valfact, 0))
           FROM myappdb.detsalida d
           WHERE d.codsalida = s.codsalida
             AND upper(btrim(coalesce(d.pagado::text, ''))) IN ('S', 'P')
         ), 0)
   WHERE s.id = ANY (v_ids);
  GET DIAGNOSTICS v_total_salidas = ROW_COUNT;

  IF v_total_salidas <> cardinality(v_ids) THEN
    RAISE EXCEPTION 'No se pudieron cerrar todas las salidas (% de %).', v_total_salidas, cardinality(v_ids)
      USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'salidas', v_total_salidas,
    'detalles', v_total_det,
    'facturas', v_total_fact,
    'codsalidas', to_jsonb(v_codsalidas)
  );
END;
$$;

REVOKE ALL ON FUNCTION myappdb.cobrar_salidas_chofer(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION myappdb.cobrar_salidas_chofer(jsonb, jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
