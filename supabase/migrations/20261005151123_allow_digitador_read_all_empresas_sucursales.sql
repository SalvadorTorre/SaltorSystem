begin;

drop policy if exists rls_select_tenant on myappdb.empresas;

create policy rls_select_tenant
on myappdb.empresas
for select
to authenticated
using (
  (select coalesce(app_private.is_root(), false))
  or 6 = (
    select cu.idtipousuario
    from app_private.current_usuario() cu
    limit 1
  )
  or cod_empre = (
    select cu.cod_empre
    from app_private.current_usuario() cu
    limit 1
  )
);

drop policy if exists rls_select_tenant on myappdb.sucursales;

create policy rls_select_tenant
on myappdb.sucursales
for select
to authenticated
using (
  (select coalesce(app_private.is_root(), false))
  or 6 = (
    select cu.idtipousuario
    from app_private.current_usuario() cu
    limit 1
  )
  or cod_empre = (
    select cu.cod_empre
    from app_private.current_usuario() cu
    limit 1
  )
);

commit;

notify pgrst, 'reload schema';
