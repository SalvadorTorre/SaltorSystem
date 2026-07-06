-- Permite que usuarios vendedores trabajen cotizaciones de su misma empresa/sucursal.
-- En este formulario ct_codvend puede guardar la clave digitada del vendedor, no siempre
-- usuario.codusuario; por eso la politica no debe depender solo de ese campo.

DROP POLICY IF EXISTS rls_select_tenant ON myappdb.cotizacion;
DROP POLICY IF EXISTS rls_insert_tenant ON myappdb.cotizacion;
DROP POLICY IF EXISTS rls_update_tenant ON myappdb.cotizacion;
DROP POLICY IF EXISTS rls_delete_tenant ON myappdb.cotizacion;

CREATE POLICY rls_select_tenant ON myappdb.cotizacion
FOR SELECT TO authenticated
USING (
  app_private.can_access_row(
    ct_codempr::text,
    ct_cod_sucu::text,
    ct_codvend::text,
    nullif(regexp_replace(ct_codvend::text, '[^0-9]', '', 'g'), '')::integer
  )
  OR EXISTS (
    SELECT 1
    FROM app_private.current_usuario() cu
    WHERE cu.idtipousuario = 3
      AND upper(coalesce(cu.cod_empre, '')) = upper(coalesce(ct_codempr::text, ''))
      AND cu.sucursalid = ct_cod_sucu
  )
);

CREATE POLICY rls_insert_tenant ON myappdb.cotizacion
FOR INSERT TO authenticated
WITH CHECK (
  app_private.can_access_row(
    ct_codempr::text,
    ct_cod_sucu::text,
    ct_codvend::text,
    nullif(regexp_replace(ct_codvend::text, '[^0-9]', '', 'g'), '')::integer
  )
  OR EXISTS (
    SELECT 1
    FROM app_private.current_usuario() cu
    WHERE cu.idtipousuario = 3
      AND upper(coalesce(cu.cod_empre, '')) = upper(coalesce(ct_codempr::text, ''))
      AND cu.sucursalid = ct_cod_sucu
  )
);

CREATE POLICY rls_update_tenant ON myappdb.cotizacion
FOR UPDATE TO authenticated
USING (
  app_private.can_access_row(
    ct_codempr::text,
    ct_cod_sucu::text,
    ct_codvend::text,
    nullif(regexp_replace(ct_codvend::text, '[^0-9]', '', 'g'), '')::integer
  )
  OR EXISTS (
    SELECT 1
    FROM app_private.current_usuario() cu
    WHERE cu.idtipousuario = 3
      AND upper(coalesce(cu.cod_empre, '')) = upper(coalesce(ct_codempr::text, ''))
      AND cu.sucursalid = ct_cod_sucu
  )
)
WITH CHECK (
  app_private.can_access_row(
    ct_codempr::text,
    ct_cod_sucu::text,
    ct_codvend::text,
    nullif(regexp_replace(ct_codvend::text, '[^0-9]', '', 'g'), '')::integer
  )
  OR EXISTS (
    SELECT 1
    FROM app_private.current_usuario() cu
    WHERE cu.idtipousuario = 3
      AND upper(coalesce(cu.cod_empre, '')) = upper(coalesce(ct_codempr::text, ''))
      AND cu.sucursalid = ct_cod_sucu
  )
);

CREATE POLICY rls_delete_tenant ON myappdb.cotizacion
FOR DELETE TO authenticated
USING (
  app_private.can_access_row(
    ct_codempr::text,
    ct_cod_sucu::text,
    ct_codvend::text,
    nullif(regexp_replace(ct_codvend::text, '[^0-9]', '', 'g'), '')::integer
  )
  OR EXISTS (
    SELECT 1
    FROM app_private.current_usuario() cu
    WHERE cu.idtipousuario = 3
      AND upper(coalesce(cu.cod_empre, '')) = upper(coalesce(ct_codempr::text, ''))
      AND cu.sucursalid = ct_cod_sucu
  )
);
