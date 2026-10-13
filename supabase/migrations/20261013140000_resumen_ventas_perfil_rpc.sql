-- Resumen de ventas del mes para "Mi perfil" (sucursal + vendedor conectado).
--
-- Antes, la pantalla descargaba todas las facturas del mes (una consulta por
-- dia) y sumaba en el navegador. Para usuarios que no son root, la politica
-- RLS de myappdb.factura evalua varias funciones por cada fila y la consulta
-- terminaba en "canceling statement due to statement timeout" (57014).
--
-- Esta funcion valida al usuario UNA sola vez y devuelve los totales ya
-- calculados en una unica llamada.

CREATE INDEX IF NOT EXISTS idx_factura_empr_sucu_fecha
  ON myappdb.factura (fa_codempr, fa_codsucu, fa_fecfact);

CREATE OR REPLACE FUNCTION myappdb.resumen_ventas_perfil(
  p_fecha_desde date,
  p_fecha_hasta date,
  p_sucursal_id integer DEFAULT NULL,
  p_empresa text DEFAULT NULL
)
RETURNS TABLE (
  meta_facturar numeric,
  total_factura_sucursal bigint,
  valor_facturado_sucursal numeric,
  costo_facturado_sucursal numeric,
  total_factura_vendedor bigint,
  valor_facturado_vendedor numeric,
  costo_facturado_vendedor numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = myappdb, public
AS $$
DECLARE
  cu record;
  u record;
  v_empresa text;
  v_sucursal integer;
  v_meta numeric := 0;
  v_codigos text[];
  v_nombre text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO cu FROM app_private.current_usuario() LIMIT 1;
  IF cu IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado' USING ERRCODE = '42501';
  END IF;

  IF p_fecha_desde IS NULL OR p_fecha_hasta IS NULL OR p_fecha_hasta < p_fecha_desde THEN
    RAISE EXCEPTION 'Rango de fechas invalido' USING ERRCODE = '22023';
  END IF;

  v_empresa := coalesce(nullif(btrim(p_empresa), ''), cu.cod_empre);
  v_sucursal := coalesce(nullif(p_sucursal_id, 0), cu.sucursalid);

  IF v_sucursal IS NULL THEN
    RAISE EXCEPTION 'El usuario no tiene una sucursal valida asignada.' USING ERRCODE = '22023';
  END IF;

  -- Misma regla de alcance que usa la RLS: root ve todo; los demas solo su
  -- empresa y sucursal.
  IF NOT app_private.current_usuario_tenant_ok(v_empresa, v_sucursal::text) THEN
    RAISE EXCEPTION 'Sin acceso a la sucursal solicitada' USING ERRCODE = '42501';
  END IF;

  -- Meta de la sucursal (la columna aparece como meta_ventas o meta_vents
  -- segun la version del esquema; se lee de forma tolerante).
  SELECT coalesce(
           nullif(to_jsonb(s) ->> 'meta_ventas', '')::numeric,
           nullif(to_jsonb(s) ->> 'meta_vents', '')::numeric,
           0
         )
    INTO v_meta
  FROM myappdb.sucursales s
  WHERE s.cod_sucursal = v_sucursal
    AND (v_empresa IS NULL OR upper(coalesce(s.cod_empre::text, '')) = upper(v_empresa))
  LIMIT 1;

  -- Identificadores del vendedor conectado, normalizados igual que el frontend:
  -- numeros sin ceros a la izquierda; texto en minuscula y solo [a-z0-9].
  SELECT us.codusuario::text AS codusuario,
         us.claveusuario::text AS claveusuario,
         us.idusuario::text AS idusuario,
         us.nombreusuario::text AS nombreusuario
    INTO u
  FROM myappdb.usuario us
  WHERE us.auth_user_id = auth.uid()
  LIMIT 1;

  SELECT array_agg(DISTINCT x) INTO v_codigos
  FROM (
    SELECT CASE
             WHEN btrim(val) ~ '^[0-9]+$' THEN btrim(val)::numeric::text
             ELSE regexp_replace(lower(btrim(val)), '[^a-z0-9]', '', 'g')
           END AS x
    FROM unnest(ARRAY[u.codusuario, u.claveusuario, u.idusuario]) AS val
    WHERE val IS NOT NULL AND btrim(val) <> ''
  ) t
  WHERE x <> '';

  v_nombre := lower(regexp_replace(btrim(translate(
    coalesce(u.nombreusuario, ''),
    'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'
  )), '\s+', ' ', 'g'));

  RETURN QUERY
  WITH facturas AS (
    SELECT
      coalesce(f.fa_valfact, 0)::numeric AS valor,
      coalesce(f.fa_cosfact, 0)::numeric AS costo,
      (
        (
          v_codigos IS NOT NULL
          AND (
            CASE
              WHEN btrim(coalesce(f.fa_codvend::text, '')) ~ '^[0-9]+$'
                THEN btrim(f.fa_codvend::text)::numeric::text
              ELSE regexp_replace(lower(btrim(coalesce(f.fa_codvend::text, ''))), '[^a-z0-9]', '', 'g')
            END
          ) = ANY (v_codigos)
        )
        OR (
          v_nombre <> ''
          AND lower(regexp_replace(btrim(translate(
                coalesce(f.fa_nomvend::text, ''),
                'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'
              )), '\s+', ' ', 'g')) = v_nombre
        )
      ) AS es_del_vendedor
    FROM myappdb.factura f
    WHERE f.fa_codsucu = v_sucursal
      AND (v_empresa IS NULL OR f.fa_codempr = v_empresa)
      AND f.fa_fecfact BETWEEN p_fecha_desde AND p_fecha_hasta
  )
  SELECT
    coalesce(v_meta, 0),
    count(*)::bigint,
    coalesce(sum(valor), 0),
    coalesce(sum(costo), 0),
    count(*) FILTER (WHERE es_del_vendedor)::bigint,
    coalesce(sum(valor) FILTER (WHERE es_del_vendedor), 0),
    coalesce(sum(costo) FILTER (WHERE es_del_vendedor), 0)
  FROM facturas;
END;
$$;

REVOKE ALL ON FUNCTION myappdb.resumen_ventas_perfil(date, date, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION myappdb.resumen_ventas_perfil(date, date, integer, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
