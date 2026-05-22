-- Ejecutar en Supabase SQL Editor.
-- Corrige:
-- new row violates row-level security policy for table "solicitud"

begin;

grant usage on schema myappdb to authenticated;
grant select, insert, update, delete on table myappdb.solicitud to authenticated;
grant select, insert, update, delete on table myappdb.detsolicitud to authenticated;
grant usage, select on all sequences in schema myappdb to authenticated;

alter table myappdb.solicitud enable row level security;
alter table myappdb.detsolicitud enable row level security;

drop policy if exists solicitud_select_tenant on myappdb.solicitud;
drop policy if exists solicitud_insert_tenant on myappdb.solicitud;
drop policy if exists solicitud_update_tenant on myappdb.solicitud;
drop policy if exists solicitud_delete_tenant on myappdb.solicitud;

create policy solicitud_select_tenant
on myappdb.solicitud
for select
to authenticated
using (
  app_private.can_access_row(
    so_codempr::text,
    so_codsucu::text,
    null,
    null
  )
);

create policy solicitud_insert_tenant
on myappdb.solicitud
for insert
to authenticated
with check (
  app_private.can_access_row(
    so_codempr::text,
    so_codsucu::text,
    null,
    null
  )
);

create policy solicitud_update_tenant
on myappdb.solicitud
for update
to authenticated
using (
  app_private.can_access_row(
    so_codempr::text,
    so_codsucu::text,
    null,
    null
  )
)
with check (
  app_private.can_access_row(
    so_codempr::text,
    so_codsucu::text,
    null,
    null
  )
);

create policy solicitud_delete_tenant
on myappdb.solicitud
for delete
to authenticated
using (
  app_private.can_access_row(
    so_codempr::text,
    so_codsucu::text,
    null,
    null
  )
);

drop policy if exists detsolicitud_select_tenant on myappdb.detsolicitud;
drop policy if exists detsolicitud_insert_tenant on myappdb.detsolicitud;
drop policy if exists detsolicitud_update_tenant on myappdb.detsolicitud;
drop policy if exists detsolicitud_delete_tenant on myappdb.detsolicitud;

create policy detsolicitud_select_tenant
on myappdb.detsolicitud
for select
to authenticated
using (
  exists (
    select 1
    from myappdb.solicitud s
    where s.so_codsoli::text = ds_codsoli::text
      and app_private.can_access_row(
        s.so_codempr::text,
        s.so_codsucu::text,
        null,
        null
      )
  )
);

create policy detsolicitud_insert_tenant
on myappdb.detsolicitud
for insert
to authenticated
with check (
  exists (
    select 1
    from myappdb.solicitud s
    where s.so_codsoli::text = ds_codsoli::text
      and app_private.can_access_row(
        s.so_codempr::text,
        s.so_codsucu::text,
        null,
        null
      )
  )
);

create policy detsolicitud_update_tenant
on myappdb.detsolicitud
for update
to authenticated
using (
  exists (
    select 1
    from myappdb.solicitud s
    where s.so_codsoli::text = ds_codsoli::text
      and app_private.can_access_row(
        s.so_codempr::text,
        s.so_codsucu::text,
        null,
        null
      )
  )
)
with check (
  exists (
    select 1
    from myappdb.solicitud s
    where s.so_codsoli::text = ds_codsoli::text
      and app_private.can_access_row(
        s.so_codempr::text,
        s.so_codsucu::text,
        null,
        null
      )
  )
);

create policy detsolicitud_delete_tenant
on myappdb.detsolicitud
for delete
to authenticated
using (
  exists (
    select 1
    from myappdb.solicitud s
    where s.so_codsoli::text = ds_codsoli::text
      and app_private.can_access_row(
        s.so_codempr::text,
        s.so_codsucu::text,
        null,
        null
      )
  )
);

commit;

notify pgrst, 'reload schema';
