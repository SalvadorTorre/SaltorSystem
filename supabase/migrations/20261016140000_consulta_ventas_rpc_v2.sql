-- Consulta de ventas v2: misma firma y mismo resultado que
-- 20261015190000_consulta_ventas_rpc.sql, pero mucho mas rapida.
--
-- La v1 unia las facturas con las combinaciones permitidas usando
-- IS NOT DISTINCT FROM. Eso obligaba a un nested loop que volvia a evaluar
-- current_usuario_tenant_ok() y has_any_permission() por cada factura
-- (1195 facturas x 14 combinaciones = ~7 s), y la API cortaba la consulta
-- con statement timeout (57014).
--
-- Ahora los permisos se calculan UNA vez por combinacion empresa/sucursal en
-- una instruccion aparte, y las facturas se filtran contra ese arreglo.

CREATE OR REPLACE FUNCTION myappdb.consulta_ventas_rango(
  p_fecha_desde date,
  p_fecha_hasta date,
  p_empresa text DEFAULT NULL,
  p_sucursal_id integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = myappdb, public
AS $$
DECLARE
  v_empresa text := nullif(btrim(coalesce(p_empresa, '')), '');
  v_sucursal integer := nullif(p_sucursal_id, 0);
  v_permitidas text[];
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING ERRCODE = '42501';
  END IF;

  IF p_fecha_desde IS NULL OR p_fecha_hasta IS NULL OR p_fecha_hasta < p_fecha_desde THEN
    RAISE EXCEPTION 'Rango de fechas invalido' USING ERRCODE = '22023';
  END IF;

  IF lower(coalesce(v_empresa, '')) IN ('todas', 'todos') THEN
    v_empresa := NULL;
  END IF;

  -- 1) Combinaciones empresa/sucursal presentes en el rango que el usuario
  --    puede ver. Misma condicion que la politica factura_select_permiso,
  --    evaluada una sola vez por combinacion.
  SELECT coalesce(array_agg(c.clave), ARRAY[]::text[])
    INTO v_permitidas
  FROM (
    SELECT DISTINCT
           f.fa_codempr,
           f.fa_codsucu,
           coalesce(f.fa_codempr::text, '') || '|' || coalesce(f.fa_codsucu::text, '') AS clave
    FROM myappdb.factura f
    WHERE f.fa_fecfact BETWEEN p_fecha_desde AND p_fecha_hasta
      AND (v_empresa IS NULL OR f.fa_codempr = v_empresa)
      AND (v_sucursal IS NULL OR f.fa_codsucu = v_sucursal)
  ) c
  WHERE app_private.current_usuario_tenant_ok(c.fa_codempr::text, c.fa_codsucu::text)
    AND app_private.has_any_permission(
      '[
        {"recurso":"facturacion.factura","accion":"ver"},
        {"recurso":"caja.cobrofact","accion":"ver"},
        {"recurso":"contabilidad.facturas_pendientes","accion":"ver"}
      ]'::jsonb,
      c.fa_codempr::text,
      c.fa_codsucu::text
    );

  IF cardinality(v_permitidas) = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  -- 2) Facturas del rango filtradas por las combinaciones permitidas.
  SELECT coalesce(
           jsonb_agg(to_jsonb(b) ORDER BY b.fa_fecfact DESC, b.fa_codfact DESC),
           '[]'::jsonb
         )
    INTO v_result
  FROM (
    SELECT f.fa_codfact, f.fa_nomvend, f.fa_codvend, f.fa_codempr, f.fa_codsucu,
           f.fa_valfact, f.fa_cosfact, f.fa_fecfact, f.fa_codclie, f.fa_nomclie,
           f.fa_telclie
    FROM myappdb.factura f
    WHERE f.fa_fecfact BETWEEN p_fecha_desde AND p_fecha_hasta
      AND (v_empresa IS NULL OR f.fa_codempr = v_empresa)
      AND (v_sucursal IS NULL OR f.fa_codsucu = v_sucursal)
      AND (coalesce(f.fa_codempr::text, '') || '|' || coalesce(f.fa_codsucu::text, ''))
          = ANY (v_permitidas)
  ) b;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION myappdb.consulta_ventas_rango(date, date, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION myappdb.consulta_ventas_rango(date, date, text, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
