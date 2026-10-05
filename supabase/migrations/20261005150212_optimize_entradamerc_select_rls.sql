begin;

create index if not exists idx_entradamerc_empresa_sucursal_codigo
  on myappdb.entradamerc (me_codempr, me_codsucu, me_codentr desc);

drop policy if exists rls_select_tenant on myappdb.entradamerc;

create policy rls_select_tenant
on myappdb.entradamerc
for select
to authenticated
using (
  (select coalesce(app_private.is_root(), false))
  or (
    me_codempr = (
      select cu.cod_empre
      from app_private.current_usuario() cu
      limit 1
    )
    and (
      (select coalesce(app_private.is_admin(), false))
      or (
        me_codsucu = (
          select cu.sucursalid
          from app_private.current_usuario() cu
          limit 1
        )
        and (
          upper(coalesce(me_codvend::text, '')) = upper(coalesce((
            select cu.idusuario
            from app_private.current_usuario() cu
            limit 1
          ), ''))
          or 6 = (
            select cu.idtipousuario
            from app_private.current_usuario() cu
            limit 1
          )
        )
      )
    )
  )
);

commit;

notify pgrst, 'reload schema';
