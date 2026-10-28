-- Consulta de ventas v4 (/reporte/consulta-ventas y ventas por vendedor).
-- Misma firma y mismo resultado que la v3; corrige de nuevo
-- "canceling statement due to statement timeout".
--
-- Cambios:
--  * Asegura los indices por fecha (estaban solo en la v1; si la v1 no se
--    ejecuto, cada consulta recorria toda la tabla factura dos veces).
--  * Recorre las facturas del rango UNA sola vez (CTE materializada) y valida
--    los permisos una vez por empresa/sucursal sobre ese resultado.

CREATE INDEX IF NOT EXISTS idx_factura_fecfact
  ON myappdb.factura (fa_fecfact);

CREATE INDEX IF NOT EXISTS idx_factura_sucu_fecha
  ON myappdb.factura (fa_codsucu, fa_fecfact);

CREATE INDEX IF NOT EXISTS idx_factura_empr_sucu_fecha
  ON myappdb.factura (fa_codempr, fa_codsucu, fa_fecfact);

ANALYZE myappdb.factura;

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

  WITH base AS MATERIALIZED (
    SELECT f.fa_codfact, f.fa_nomvend, f.fa_codvend, f.fa_codempr, f.fa_codsucu,
           f.fa_valfact, f.fa_cosfact, f.fa_fecfact, f.fa_codclie, f.fa_nomclie,
           f.fa_telclie, f.fa_valnotacredit
    FROM myappdb.factura f
    WHERE f.fa_fecfact BETWEEN p_fecha_desde AND p_fecha_hasta
      AND (v_empresa IS NULL OR f.fa_codempr = v_empresa)
      AND (v_sucursal IS NULL OR f.fa_codsucu = v_sucursal)
  ),
  combinaciones AS MATERIALIZED (
    SELECT DISTINCT b.fa_codempr, b.fa_codsucu
    FROM base b
  ),
  permitidas AS MATERIALIZED (
    -- Misma condicion que la politica factura_select_permiso, una vez por combinacion.
    SELECT c.fa_codempr, c.fa_codsucu
    FROM combinaciones c
    WHERE app_private.current_usuario_tenant_ok(c.fa_codempr::text, c.fa_codsucu::text)
      AND app_private.has_any_permission(
        '[
          {"recurso":"facturacion.factura","accion":"ver"},
          {"recurso":"caja.cobrofact","accion":"ver"},
          {"recurso":"contabilidad.facturas_pendientes","accion":"ver"}
        ]'::jsonb,
        c.fa_codempr::text,
        c.fa_codsucu::text
      )
  )
  SELECT coalesce(
           jsonb_agg(to_jsonb(b) ORDER BY b.fa_fecfact DESC, b.fa_codfact DESC),
           '[]'::jsonb
         )
    INTO v_result
  FROM base b
  WHERE EXISTS (
    SELECT 1 FROM permitidas p
    WHERE coalesce(p.fa_codempr::text, '') = coalesce(b.fa_codempr::text, '')
      AND coalesce(p.fa_codsucu, -1) = coalesce(b.fa_codsucu, -1)
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION myappdb.consulta_ventas_rango(date, date, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION myappdb.consulta_ventas_rango(date, date, text, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
