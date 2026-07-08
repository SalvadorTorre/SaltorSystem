CREATE INDEX IF NOT EXISTS idx_factura_607_recent
  ON myappdb.factura (fa_codempr, fa_codsucu, fa_fecfact DESC, fa_fehora DESC, fa_codfact DESC);

CREATE INDEX IF NOT EXISTS idx_factura_607_estado_fecha
  ON myappdb.factura (estado_envio_dgii, estado_dgii, fa_fecfact DESC);

CREATE INDEX IF NOT EXISTS idx_factura_607_tipo_fecha
  ON myappdb.factura (fa_tiponcf, fa_fecfact DESC);

DROP FUNCTION IF EXISTS myappdb.listar_reporte_607(integer, integer, text, date, date, date, integer, text);

CREATE OR REPLACE FUNCTION myappdb.listar_reporte_607(
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20,
  p_search text DEFAULT NULL,
  p_fecha date DEFAULT NULL,
  p_fecha_desde date DEFAULT NULL,
  p_fecha_hasta date DEFAULT NULL,
  p_tipo_comprobante integer DEFAULT NULL,
  p_estado_dgii text DEFAULT NULL,
  p_empresa text DEFAULT NULL,
  p_sucursal integer DEFAULT NULL
)
RETURNS TABLE (
  total_count bigint,
  fa_codfact varchar,
  fa_ncffact varchar,
  fa_rncfact varchar,
  fa_tiponcf integer,
  fa_fecfact date,
  fa_fechora timestamptz,
  fa_fehora timestamptz,
  fa_valfact numeric,
  fa_itbifact numeric,
  fa_subfact numeric,
  fa_nomclie varchar,
  fa_codempr varchar,
  fa_codsucu integer,
  estado_dgii varchar,
  estado_envio_dgii varchar,
  codseguridad varchar,
  qr_link varchar,
  fec_firma varchar,
  dgii_track_id text,
  dgii_codigo text,
  dgii_error_message text,
  dgii_mensajes jsonb,
  dgii_response_json jsonb,
  dgii_response_raw jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = myappdb, public
AS $$
DECLARE
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := least(greatest(coalesce(p_page_size, 20), 1), 1000);
  v_offset integer := (greatest(coalesce(p_page, 1), 1) - 1) * least(greatest(coalesce(p_page_size, 20), 1), 1000);
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_estado text := nullif(btrim(coalesce(p_estado_dgii, '')), '');
  v_empresa text := nullif(btrim(coalesce(p_empresa, '')), '');
  cu record;
  v_is_root boolean := false;
  v_is_admin boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO cu FROM app_private.current_usuario() LIMIT 1;
  IF cu IS NULL THEN
    RETURN;
  END IF;

  v_is_root := coalesce(app_private.is_root(), false);
  v_is_admin := coalesce(app_private.is_admin(), false);

  RETURN QUERY
  WITH filtered AS (
    SELECT f.*
    FROM myappdb.factura f
    WHERE coalesce(f.estado_envio_dgii, '') <> ''
      AND upper(coalesce(f.estado_envio_dgii, '')) <> 'PENDIENTE'
      AND (
        v_is_root
        OR (
          upper(coalesce(f.fa_codempr, '')) = upper(coalesce(cu.cod_empre, ''))
          AND (v_is_admin OR f.fa_codsucu = cu.sucursalid)
        )
      )
      AND (v_empresa IS NULL OR upper(coalesce(f.fa_codempr, '')) = upper(v_empresa))
      AND (p_sucursal IS NULL OR f.fa_codsucu = p_sucursal)
      AND (p_fecha IS NULL OR f.fa_fecfact = p_fecha)
      AND (p_fecha IS NOT NULL OR p_fecha_desde IS NULL OR f.fa_fecfact >= p_fecha_desde)
      AND (p_fecha IS NOT NULL OR p_fecha_hasta IS NULL OR f.fa_fecfact <= p_fecha_hasta)
      AND (p_tipo_comprobante IS NULL OR f.fa_tiponcf = p_tipo_comprobante)
      AND (
        v_estado IS NULL
        OR f.estado_dgii ILIKE '%' || v_estado || '%'
        OR f.estado_envio_dgii ILIKE '%' || v_estado || '%'
      )
      AND (
        v_search IS NULL
        OR f.fa_codfact ILIKE '%' || v_search || '%'
        OR f.fa_ncffact ILIKE '%' || v_search || '%'
        OR f.fa_nomclie ILIKE '%' || v_search || '%'
        OR f.fa_rncfact ILIKE '%' || v_search || '%'
        OR f.codseguridad ILIKE '%' || v_search || '%'
        OR f.estado_dgii ILIKE '%' || v_search || '%'
        OR f.estado_envio_dgii ILIKE '%' || v_search || '%'
        OR f.dgii_codigo ILIKE '%' || v_search || '%'
        OR f.dgii_track_id ILIKE '%' || v_search || '%'
        OR f.dgii_error_message ILIKE '%' || v_search || '%'
      )
  ),
  counted AS (
    SELECT count(*) AS total_count FROM filtered
  )
  SELECT
    counted.total_count,
    filtered.fa_codfact,
    filtered.fa_ncffact,
    filtered.fa_rncfact,
    filtered.fa_tiponcf,
    filtered.fa_fecfact,
    filtered.fa_fechora,
    filtered.fa_fehora,
    filtered.fa_valfact,
    filtered.fa_itbifact,
    filtered.fa_subfact,
    filtered.fa_nomclie,
    filtered.fa_codempr,
    filtered.fa_codsucu,
    filtered.estado_dgii,
    filtered.estado_envio_dgii,
    filtered.codseguridad,
    filtered.qr_link,
    filtered.fec_firma,
    filtered.dgii_track_id,
    filtered.dgii_codigo,
    filtered.dgii_error_message,
    filtered.dgii_mensajes,
    filtered.dgii_response_json,
    filtered.dgii_response_raw
  FROM filtered
  CROSS JOIN counted
  ORDER BY filtered.fa_fecfact DESC NULLS LAST,
           filtered.fa_fehora DESC NULLS LAST,
           filtered.fa_fechora DESC NULLS LAST,
           filtered.fa_codfact DESC
  LIMIT v_page_size
  OFFSET v_offset;
END;
$$;

REVOKE ALL ON FUNCTION myappdb.listar_reporte_607(integer, integer, text, date, date, date, integer, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION myappdb.listar_reporte_607(integer, integer, text, date, date, date, integer, text, text, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
