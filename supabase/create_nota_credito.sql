-- Ejecutar en Supabase SQL Editor.
-- Crea las tablas para /contabilidad/nota-credito con control por empresa y sucursal.

begin;

alter table if exists myappdb.contfactura
add column if not exists contnotacredito int4;

create table if not exists myappdb.nota_credito (
  nc_numero varchar(30) primary key,
  nc_factura varchar(12) not null,
  nc_encf varchar(19),
  nc_fecha date not null,
  nc_vencimiento date,
  nc_ncf_modificado varchar(19),
  nc_fecha_modificada date,
  nc_codigo_modificacion varchar(2),
  nc_motivo text,
  nc_tipo_pago varchar(2),
  nc_tipo_ingreso varchar(2),
  emisor_rnc varchar(13),
  emisor_nombre varchar(120),
  emisor_nombre_comercial varchar(120),
  emisor_direccion text,
  comprador_rnc varchar(13),
  comprador_nombre varchar(120),
  comprador_correo varchar(120),
  comprador_direccion text,
  notas text,
  subtotal numeric(14,2) default 0,
  descuento_total numeric(14,2) default 0,
  itbis_total numeric(14,2) default 0,
  total numeric(14,2) default 0,
  estado_dgii varchar(60),
  track_id varchar(120),
  codigo_seguridad varchar(120),
  qr_link text,
  request_json jsonb,
  response_json jsonb,
  fa_codempr varchar(6) not null,
  fa_codsucu int4 not null,
  usuario varchar(60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists myappdb.det_nota_credito (
  id bigserial primary key,
  nc_numero varchar(30) not null references myappdb.nota_credito(nc_numero) on delete cascade,
  linea int4 not null,
  descripcion text not null,
  cantidad numeric(14,4) default 0,
  precio numeric(14,4) default 0,
  descuento numeric(14,2) default 0,
  itbis_porcentaje numeric(8,2) default 0,
  monto numeric(14,2) default 0,
  itbis_monto numeric(14,2) default 0,
  total numeric(14,2) default 0
);

create index if not exists idx_nota_credito_tenant_fecha
on myappdb.nota_credito (fa_codempr, fa_codsucu, nc_fecha desc, nc_numero desc);

create index if not exists idx_nota_credito_factura
on myappdb.nota_credito (fa_codempr, fa_codsucu, nc_factura);

create index if not exists idx_det_nota_credito_numero
on myappdb.det_nota_credito (nc_numero, linea);

grant usage on schema myappdb to anon, authenticated, service_role;
grant select, insert, update, delete on table myappdb.nota_credito to anon, authenticated, service_role;
grant select, insert, update, delete on table myappdb.det_nota_credito to anon, authenticated, service_role;
grant usage, select on all sequences in schema myappdb to anon, authenticated, service_role;

alter table myappdb.nota_credito enable row level security;
alter table myappdb.det_nota_credito enable row level security;

drop policy if exists nota_credito_select_tenant on myappdb.nota_credito;
drop policy if exists nota_credito_insert_tenant on myappdb.nota_credito;
drop policy if exists nota_credito_update_tenant on myappdb.nota_credito;
drop policy if exists nota_credito_delete_tenant on myappdb.nota_credito;

create policy nota_credito_select_tenant
on myappdb.nota_credito
for select
to anon, authenticated
using (app_private.can_access_row(fa_codempr::text, fa_codsucu::text, null, null));

create policy nota_credito_insert_tenant
on myappdb.nota_credito
for insert
to anon, authenticated
with check (app_private.can_access_row(fa_codempr::text, fa_codsucu::text, null, null));

create policy nota_credito_update_tenant
on myappdb.nota_credito
for update
to anon, authenticated
using (app_private.can_access_row(fa_codempr::text, fa_codsucu::text, null, null))
with check (app_private.can_access_row(fa_codempr::text, fa_codsucu::text, null, null));

create policy nota_credito_delete_tenant
on myappdb.nota_credito
for delete
to anon, authenticated
using (app_private.can_access_row(fa_codempr::text, fa_codsucu::text, null, null));

drop policy if exists det_nota_credito_select_tenant on myappdb.det_nota_credito;
drop policy if exists det_nota_credito_insert_tenant on myappdb.det_nota_credito;
drop policy if exists det_nota_credito_update_tenant on myappdb.det_nota_credito;
drop policy if exists det_nota_credito_delete_tenant on myappdb.det_nota_credito;

create policy det_nota_credito_select_tenant
on myappdb.det_nota_credito
for select
to anon, authenticated
using (
  exists (
    select 1
    from myappdb.nota_credito n
    where n.nc_numero = det_nota_credito.nc_numero
      and app_private.can_access_row(n.fa_codempr::text, n.fa_codsucu::text, null, null)
  )
);

create policy det_nota_credito_insert_tenant
on myappdb.det_nota_credito
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from myappdb.nota_credito n
    where n.nc_numero = det_nota_credito.nc_numero
      and app_private.can_access_row(n.fa_codempr::text, n.fa_codsucu::text, null, null)
  )
);

create policy det_nota_credito_update_tenant
on myappdb.det_nota_credito
for update
to anon, authenticated
using (
  exists (
    select 1
    from myappdb.nota_credito n
    where n.nc_numero = det_nota_credito.nc_numero
      and app_private.can_access_row(n.fa_codempr::text, n.fa_codsucu::text, null, null)
  )
)
with check (
  exists (
    select 1
    from myappdb.nota_credito n
    where n.nc_numero = det_nota_credito.nc_numero
      and app_private.can_access_row(n.fa_codempr::text, n.fa_codsucu::text, null, null)
  )
);

create policy det_nota_credito_delete_tenant
on myappdb.det_nota_credito
for delete
to anon, authenticated
using (
  exists (
    select 1
    from myappdb.nota_credito n
    where n.nc_numero = det_nota_credito.nc_numero
      and app_private.can_access_row(n.fa_codempr::text, n.fa_codsucu::text, null, null)
  )
);

commit;

notify pgrst, 'reload schema';
