-- Optimiza /reporte/rendimiento-choferes para consultas por sucursal y mes.
CREATE INDEX IF NOT EXISTS idx_salida_rendimiento_sucursal_fecha
  ON myappdb.salida (idsucursal, fecsalida DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_salida_rendimiento_fecha
  ON myappdb.salida (fecsalida DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_detsalida_idsalida_codfact
  ON myappdb.detsalida (idsalida, codfact);

CREATE INDEX IF NOT EXISTS idx_detsalida_rendimiento_sucursal_fecha
  ON myappdb.detsalida (idsucursal, fecfact DESC, idsalida DESC);

ANALYZE myappdb.salida;
ANALYZE myappdb.detsalida;

CREATE OR REPLACE FUNCTION myappdb.reporte_rendimiento_choferes(
  p_sucursal integer,
  p_desde date,
  p_hasta date
)
RETURNS TABLE (
  codchofer text,
  nomchofer text,
  facturas bigint,
  total numeric,
  controles bigint,
  ultima_salida date
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = myappdb, public
AS $$
  SELECT
    coalesce(s.codchofer::text, 'S/C') AS codchofer,
    coalesce(nullif(btrim(s.nomchofer), ''), 'Sin chofer') AS nomchofer,
    count(*)::bigint AS facturas,
    coalesce(sum(d.valfact), 0)::numeric AS total,
    count(DISTINCT s.id)::bigint AS controles,
    max(s.fecsalida)::date AS ultima_salida
  FROM myappdb.salida s
  JOIN myappdb.detsalida d ON d.idsalida = s.id
  WHERE (p_sucursal IS NULL OR p_sucursal = 0 OR s.idsucursal = p_sucursal)
    AND s.fecsalida >= p_desde
    AND s.fecsalida <= p_hasta
  GROUP BY
    coalesce(s.codchofer::text, 'S/C'),
    coalesce(nullif(btrim(s.nomchofer), ''), 'Sin chofer')
  ORDER BY coalesce(sum(d.valfact), 0) DESC;
$$;

REVOKE ALL ON FUNCTION myappdb.reporte_rendimiento_choferes(integer, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION myappdb.reporte_rendimiento_choferes(integer, date, date) TO authenticated;

NOTIFY pgrst, 'reload schema';
