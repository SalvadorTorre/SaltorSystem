CREATE INDEX IF NOT EXISTS idx_factura_cierre_pendiente_tenant
  ON myappdb.factura (fa_codempr, fa_codsucu, fa_codfact)
  WHERE fa_cierre IS NULL OR btrim(fa_cierre::text) IN ('', 'N');

DROP FUNCTION IF EXISTS myappdb.listar_facturas_pendientes_cierre(integer, boolean);

CREATE OR REPLACE FUNCTION myappdb.listar_facturas_pendientes_cierre(
  p_limit integer DEFAULT 5000,
  p_filtrar_sucursal boolean DEFAULT true
)
RETURNS TABLE (
  fa_codfact text,
  fa_ncffact text,
  fa_rncfact text,
  fa_tiponcf integer,
  fa_fecfact date,
  fa_valfact numeric,
  fa_itbifact numeric,
  fa_subfact numeric,
  fa_desfact numeric,
  fa_codclie text,
  fa_nomclie text,
  fa_codvend text,
  fa_nomvend text,
  fa_fpago text,
  fa_codfpago integer,
  fa_status text,
  fa_codsucu integer,
  fa_codempr text,
  fa_cierre text,
  fa_entrega text,
  fa_impresa text,
  fa_facturada text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = myappdb, public
AS $$
DECLARE
  v_limit integer := least(greatest(coalesce(p_limit, 5000), 1), 10000);
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
  SELECT
    f.fa_codfact::text,
    f.fa_ncffact::text,
    f.fa_rncfact::text,
    f.fa_tiponcf,
    f.fa_fecfact,
    f.fa_valfact,
    f.fa_itbifact,
    f.fa_subfact,
    f.fa_desfact,
    f.fa_codclie::text,
    f.fa_nomclie::text,
    f.fa_codvend::text,
    f.fa_nomvend::text,
    f.fa_fpago::text,
    f.fa_codfpago,
    f.fa_status::text,
    f.fa_codsucu,
    f.fa_codempr::text,
    f.fa_cierre::text,
    f.fa_entrega::text,
    f.fa_impresa::text,
    f.fa_facturada::text
  FROM myappdb.factura f
  WHERE (f.fa_cierre IS NULL OR btrim(f.fa_cierre::text) IN ('', 'N'))
    AND (
      v_is_root
      OR (
        upper(coalesce(f.fa_codempr, '')) = upper(coalesce(cu.cod_empre, ''))
        AND (
          NOT coalesce(p_filtrar_sucursal, true)
          OR v_is_admin
          OR f.fa_codsucu = cu.sucursalid
        )
      )
    )
  ORDER BY
    CASE
      WHEN f.fa_codfact ~ '^[0-9]+$' THEN f.fa_codfact::numeric
      ELSE NULL
    END ASC NULLS LAST,
    f.fa_codfact ASC
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION myappdb.listar_facturas_pendientes_cierre(integer, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION myappdb.listar_facturas_pendientes_cierre(integer, boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';
