begin;

drop policy if exists ventainterna_insert_digitador_sucursal on myappdb.ventainterna;

create policy ventainterna_insert_digitador_sucursal
on myappdb.ventainterna
for insert
to authenticated
with check (
  6 = (
    select cu.idtipousuario
    from app_private.current_usuario() cu
    limit 1
  )
  and fa_codempr = (
    select cu.cod_empre
    from app_private.current_usuario() cu
    limit 1
  )
  and fa_codsucu = (
    select cu.sucursalid
    from app_private.current_usuario() cu
    limit 1
  )
);

commit;

notify pgrst, 'reload schema';
