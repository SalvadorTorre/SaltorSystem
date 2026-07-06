-- Permite que usuarios DIGITADOR(A) registren entradas de mercancia
-- dentro de su misma empresa y sucursal.
-- me_codvend no siempre representa el usuario logueado, por eso no debe
-- ser el unico criterio de autorizacion para este modulo.

DROP POLICY IF EXISTS rls_select_tenant ON myappdb.entradamerc;
DROP POLICY IF EXISTS rls_insert_tenant ON myappdb.entradamerc;
DROP POLICY IF EXISTS rls_update_tenant ON myappdb.entradamerc;
DROP POLICY IF EXISTS rls_delete_tenant ON myappdb.entradamerc;

CREATE POLICY rls_select_tenant ON myappdb.entradamerc
FOR SELECT TO authenticated
USING (
  app_private.can_access_row(me_codempr::text, me_codsucu::text, me_codvend::text, NULL::integer)
  OR EXISTS (
    SELECT 1
    FROM app_private.current_usuario() cu
    WHERE cu.idtipousuario = 6
      AND upper(coalesce(cu.cod_empre, '')) = upper(coalesce(me_codempr::text, ''))
      AND cu.sucursalid = me_codsucu
  )
);

CREATE POLICY rls_insert_tenant ON myappdb.entradamerc
FOR INSERT TO authenticated
WITH CHECK (
  app_private.can_access_row(me_codempr::text, me_codsucu::text, me_codvend::text, NULL::integer)
  OR EXISTS (
    SELECT 1
    FROM app_private.current_usuario() cu
    WHERE cu.idtipousuario = 6
      AND upper(coalesce(cu.cod_empre, '')) = upper(coalesce(me_codempr::text, ''))
      AND cu.sucursalid = me_codsucu
  )
);

CREATE POLICY rls_update_tenant ON myappdb.entradamerc
FOR UPDATE TO authenticated
USING (
  app_private.can_access_row(me_codempr::text, me_codsucu::text, me_codvend::text, NULL::integer)
  OR EXISTS (
    SELECT 1
    FROM app_private.current_usuario() cu
    WHERE cu.idtipousuario = 6
      AND upper(coalesce(cu.cod_empre, '')) = upper(coalesce(me_codempr::text, ''))
      AND cu.sucursalid = me_codsucu
  )
)
WITH CHECK (
  app_private.can_access_row(me_codempr::text, me_codsucu::text, me_codvend::text, NULL::integer)
  OR EXISTS (
    SELECT 1
    FROM app_private.current_usuario() cu
    WHERE cu.idtipousuario = 6
      AND upper(coalesce(cu.cod_empre, '')) = upper(coalesce(me_codempr::text, ''))
      AND cu.sucursalid = me_codsucu
  )
);

CREATE POLICY rls_delete_tenant ON myappdb.entradamerc
FOR DELETE TO authenticated
USING (
  app_private.can_access_row(me_codempr::text, me_codsucu::text, me_codvend::text, NULL::integer)
  OR EXISTS (
    SELECT 1
    FROM app_private.current_usuario() cu
    WHERE cu.idtipousuario = 6
      AND upper(coalesce(cu.cod_empre, '')) = upper(coalesce(me_codempr::text, ''))
      AND cu.sucursalid = me_codsucu
  )
);
