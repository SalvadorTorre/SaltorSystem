-- Evita la evaluacion recursiva de can_access_row durante la deteccion
-- y carga de permisos del usuario autenticado.

drop policy if exists rls_select_tenant on myappdb.usuario_permiso_accion;
drop policy if exists usuario_permiso_accion_select_own on myappdb.usuario_permiso_accion;

create policy usuario_permiso_accion_select_own
on myappdb.usuario_permiso_accion
for select
to authenticated
using (
  codusuario = (
    select cu.codusuario
    from app_private.current_usuario() cu
    limit 1
  )
);

-- Los permisos heredados por tipo se consultan durante el fallback.
drop policy if exists rls_select_tenant on myappdb.tipousuario_permiso_accion;
drop policy if exists tipousuario_permiso_accion_select_auth on myappdb.tipousuario_permiso_accion;

create policy tipousuario_permiso_accion_select_auth
on myappdb.tipousuario_permiso_accion
for select
to authenticated
using (activo = true);
