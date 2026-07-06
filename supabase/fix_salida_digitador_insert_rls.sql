-- Corrige permisos RLS para que DIGITADOR(A) pueda registrar controles
-- de salida usando salida.idusuario como codusuario numerico.

drop policy if exists rls_select_tenant on myappdb.salida;
drop policy if exists rls_insert_tenant on myappdb.salida;
drop policy if exists rls_update_tenant on myappdb.salida;
drop policy if exists rls_delete_tenant on myappdb.salida;

create policy rls_select_tenant
on myappdb.salida
for select
to authenticated
using (
  app_private.can_access_row(null::text, idsucursal::text, null::text, idusuario)
);

create policy rls_insert_tenant
on myappdb.salida
for insert
to authenticated
with check (
  app_private.can_access_row(null::text, idsucursal::text, null::text, idusuario)
);

create policy rls_update_tenant
on myappdb.salida
for update
to authenticated
using (
  app_private.can_access_row(null::text, idsucursal::text, null::text, idusuario)
)
with check (
  app_private.can_access_row(null::text, idsucursal::text, null::text, idusuario)
);

create policy rls_delete_tenant
on myappdb.salida
for delete
to authenticated
using (
  app_private.can_access_row(null::text, idsucursal::text, null::text, idusuario)
);
