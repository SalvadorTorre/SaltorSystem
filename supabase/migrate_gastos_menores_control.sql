-- Ejecutar una vez en Supabase SQL Editor.
-- Agrega un consecutivo independiente para gastos menores por ano y sucursal.

begin;

alter table if exists myappdb.contfactura
add column if not exists contgastomenor int4 not null default 0;

create table if not exists myappdb.gasto_menor (
  gm_numero varchar(20) primary key,
  gm_encf varchar(19),
  gm_fecha date not null,
  gm_fecha_vencimiento date,
  gm_total numeric(14,2) not null default 0,
  gm_estado_dgii varchar(60) not null default 'BORRADOR',
  gm_track_id varchar(150),
  gm_request_json jsonb,
  gm_response_json jsonb,
  gm_codempr varchar(6) not null,
  gm_codsucu int4 not null,
  gm_usuario varchar(100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists myappdb.det_gasto_menor (
  id bigserial primary key,
  gm_numero varchar(20) not null references myappdb.gasto_menor(gm_numero) on delete cascade,
  linea int4 not null,
  descripcion text not null,
  cantidad numeric(14,4) not null default 0,
  precio numeric(14,4) not null default 0,
  monto numeric(14,2) not null default 0,
  unique (gm_numero, linea)
);

create index if not exists idx_gasto_menor_tenant_fecha
on myappdb.gasto_menor (gm_codempr, gm_codsucu, gm_fecha desc, gm_numero desc);

create index if not exists idx_det_gasto_menor_numero
on myappdb.det_gasto_menor (gm_numero, linea);

grant usage on schema myappdb to anon, authenticated, service_role;
grant select, update on table myappdb.contfactura to anon, authenticated, service_role;
grant select, insert, update, delete on table myappdb.gasto_menor to anon, authenticated, service_role;
grant select, insert, update, delete on table myappdb.det_gasto_menor to anon, authenticated, service_role;
grant usage, select on all sequences in schema myappdb to anon, authenticated, service_role;

alter table myappdb.gasto_menor enable row level security;
alter table myappdb.det_gasto_menor enable row level security;

drop policy if exists gasto_menor_select_tenant on myappdb.gasto_menor;
drop policy if exists gasto_menor_insert_tenant on myappdb.gasto_menor;
drop policy if exists gasto_menor_update_tenant on myappdb.gasto_menor;
drop policy if exists gasto_menor_delete_tenant on myappdb.gasto_menor;

create policy gasto_menor_select_tenant on myappdb.gasto_menor
for select to anon, authenticated
using (app_private.can_access_row(gm_codempr::text, gm_codsucu::text, null, null));

create policy gasto_menor_insert_tenant on myappdb.gasto_menor
for insert to anon, authenticated
with check (app_private.can_access_row(gm_codempr::text, gm_codsucu::text, null, null));

create policy gasto_menor_update_tenant on myappdb.gasto_menor
for update to anon, authenticated
using (app_private.can_access_row(gm_codempr::text, gm_codsucu::text, null, null))
with check (app_private.can_access_row(gm_codempr::text, gm_codsucu::text, null, null));

create policy gasto_menor_delete_tenant on myappdb.gasto_menor
for delete to anon, authenticated
using (app_private.can_access_row(gm_codempr::text, gm_codsucu::text, null, null));

drop policy if exists det_gasto_menor_select_tenant on myappdb.det_gasto_menor;
drop policy if exists det_gasto_menor_insert_tenant on myappdb.det_gasto_menor;
drop policy if exists det_gasto_menor_delete_tenant on myappdb.det_gasto_menor;

create policy det_gasto_menor_select_tenant on myappdb.det_gasto_menor
for select to anon, authenticated
using (exists (
  select 1 from myappdb.gasto_menor gm
  where gm.gm_numero = det_gasto_menor.gm_numero
    and app_private.can_access_row(gm.gm_codempr::text, gm.gm_codsucu::text, null, null)
));

create policy det_gasto_menor_insert_tenant on myappdb.det_gasto_menor
for insert to anon, authenticated
with check (exists (
  select 1 from myappdb.gasto_menor gm
  where gm.gm_numero = det_gasto_menor.gm_numero
    and app_private.can_access_row(gm.gm_codempr::text, gm.gm_codsucu::text, null, null)
));

create policy det_gasto_menor_delete_tenant on myappdb.det_gasto_menor
for delete to anon, authenticated
using (exists (
  select 1 from myappdb.gasto_menor gm
  where gm.gm_numero = det_gasto_menor.gm_numero
    and app_private.can_access_row(gm.gm_codempr::text, gm.gm_codsucu::text, null, null)
));

notify pgrst, 'reload schema';

commit;
