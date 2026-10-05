begin;

create index if not exists idx_solicitud_destino_origen_fecha
  on myappdb.solicitud (so_codsucuclie, so_codsucu, so_fecha desc);

create index if not exists idx_detsolicitud_codigo
  on myappdb.detsolicitud (ds_codsoli);

drop policy if exists solicitud_select_destino_sucursal on myappdb.solicitud;

create policy solicitud_select_destino_sucursal
on myappdb.solicitud
for select
to authenticated
using (
  so_codsucuclie = (
    select cu.sucursalid
    from app_private.current_usuario() cu
    limit 1
  )
);

drop policy if exists detsolicitud_select_destino_sucursal on myappdb.detsolicitud;

create policy detsolicitud_select_destino_sucursal
on myappdb.detsolicitud
for select
to authenticated
using (
  exists (
    select 1
    from myappdb.solicitud s
    where s.so_codsoli = detsolicitud.ds_codsoli
      and s.so_codsucuclie = (
        select cu.sucursalid
        from app_private.current_usuario() cu
        limit 1
      )
  )
);

commit;

notify pgrst, 'reload schema';
