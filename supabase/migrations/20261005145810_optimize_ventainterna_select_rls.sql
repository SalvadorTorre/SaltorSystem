begin;

create index if not exists idx_ventainterna_empresa_sucursal_codigo
  on myappdb.ventainterna (fa_codempr, fa_codsucu, fa_codfact desc);

drop policy if exists rls_select_tenant on myappdb.ventainterna;
drop policy if exists ventainterna_select_sucursal on myappdb.ventainterna;

create policy rls_select_tenant
on myappdb.ventainterna
for select
to authenticated
using (
  (select coalesce(app_private.is_root(), false))
  or (
    fa_codempr = (
      select cu.cod_empre
      from app_private.current_usuario() cu
      limit 1
    )
    and fa_codsucu = (
      select cu.sucursalid
      from app_private.current_usuario() cu
      limit 1
    )
  )
);

commit;

notify pgrst, 'reload schema';
