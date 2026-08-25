CREATE INDEX IF NOT EXISTS idx_factura_cuadrecaja_pendientes_scope
  ON myappdb.factura (fa_codempr, fa_codsucu, fa_codfact)
  WHERE (fa_cierre IS NULL OR btrim(fa_cierre::text) = '' OR btrim(fa_cierre::text) IN ('0', 'N'))
    AND (fa_status IS NULL OR fa_status <> 'N');

CREATE OR REPLACE FUNCTION myappdb.resumen_facturas_pendientes_cierre(
  p_filtrar_sucursal boolean DEFAULT true,
  p_sucursal_id integer DEFAULT NULL
)
RETURNS TABLE (
  cantidad bigint,
  inicio_factura text,
  fin_factura text,
  efectivo numeric,
  tarjeta numeric,
  credito numeric,
  deposito numeric,
  cheque numeric,
  pendiente numeric,
  valores_cobrados numeric,
  valores_no_cobrados numeric,
  total numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = myappdb, public
AS $$
DECLARE
  cu record;
  v_is_root boolean := false;
  v_is_admin boolean := false;
  v_sucursal integer := nullif(p_sucursal_id, 0);
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
  WITH elegibles AS (
    SELECT
      f.fa_codfact::text AS factura,
      CASE WHEN f.fa_codfact::text ~ '^[0-9]+$' THEN f.fa_codfact::numeric END AS factura_num,
      coalesce(f.fa_valfact, 0)::numeric AS monto,
      upper(btrim(coalesce(f.fa_fpago::text, ''))) AS fpago,
      coalesce(f.fa_codfpago, 0)::integer AS codfpago,
      coalesce(f.fa_tipopago, 1)::integer AS tipopago,
      replace(lower(coalesce(p.fp_descfpago::text, '')), 'é', 'e') AS desc_pago
    FROM myappdb.factura f
    LEFT JOIN myappdb.fpago p
      ON p.fp_codfpago = f.fa_codfpago
    WHERE (f.fa_cierre IS NULL OR btrim(f.fa_cierre::text) = '' OR btrim(f.fa_cierre::text) IN ('0', 'N'))
      AND (f.fa_status IS NULL OR f.fa_status <> 'N')
      AND (
        (
          v_sucursal IS NOT NULL
          AND f.fa_codempr = cu.cod_empre
          AND f.fa_codsucu = v_sucursal
          AND (v_is_root OR v_is_admin OR v_sucursal = cu.sucursalid)
        )
        OR (
          v_sucursal IS NULL
          AND v_is_root
        )
        OR (
          v_sucursal IS NULL
          AND f.fa_codempr = cu.cod_empre
          AND (
            NOT coalesce(p_filtrar_sucursal, true)
            OR v_is_admin
            OR f.fa_codsucu = cu.sucursalid
          )
        )
      )
  ),
  marcadas AS (
    SELECT
      *,
      fpago IN ('S', 'P', 'PAGADA', 'COBRADA') AS pagada,
      tipopago = 2 OR (codfpago <> 3 AND desc_pago LIKE '%credito%') AS es_credito
    FROM elegibles
  )
  SELECT
    count(*)::bigint AS cantidad,
    (array_agg(factura ORDER BY factura_num ASC NULLS LAST, factura ASC))[1] AS inicio_factura,
    (array_agg(factura ORDER BY factura_num DESC NULLS LAST, factura DESC))[1] AS fin_factura,
    coalesce(sum(monto) FILTER (
      WHERE pagada
        AND codfpago <> 3
        AND NOT es_credito
        AND desc_pago NOT LIKE '%deposito%'
        AND desc_pago NOT LIKE '%transferencia%'
        AND desc_pago NOT LIKE '%cheque%'
    ), 0) AS efectivo,
    coalesce(sum(monto) FILTER (WHERE pagada AND codfpago = 3), 0) AS tarjeta,
    coalesce(sum(monto) FILTER (WHERE NOT pagada AND es_credito), 0) AS credito,
    coalesce(sum(monto) FILTER (WHERE pagada AND (desc_pago LIKE '%deposito%' OR desc_pago LIKE '%transferencia%')), 0) AS deposito,
    coalesce(sum(monto) FILTER (WHERE pagada AND desc_pago LIKE '%cheque%'), 0) AS cheque,
    coalesce(sum(monto) FILTER (WHERE NOT pagada AND NOT es_credito), 0) AS pendiente,
    coalesce(sum(monto) FILTER (WHERE pagada AND NOT es_credito), 0) AS valores_cobrados,
    coalesce(sum(monto) FILTER (WHERE NOT pagada OR es_credito), 0) AS valores_no_cobrados,
    coalesce(sum(monto), 0) AS total
  FROM marcadas;
END;
$$;

REVOKE ALL ON FUNCTION myappdb.resumen_facturas_pendientes_cierre(boolean, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION myappdb.resumen_facturas_pendientes_cierre(boolean, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
