-- Mantenimientos > Configuracion > Rifa / Sorteo.
--
--  * myappdb.concurso: configuracion de cada concurso (rifa o sorteo).
--      - activo + fecha_inicio / fecha_fin: el concurso solo aplica si esta
--        activo y la fecha de la factura cae dentro del rango.
--      - modo MULTIPLO: un boleto por cada "monto_por_boleto" pesos.
--        Ej.: monto_por_boleto = 5,000 -> factura de 12,000 = 2 boletos.
--      - modo RANGO: escala de montos. Ej.: desde 5,000 = 1 boleto,
--        desde 10,000 = 3 boletos (rangos jsonb [{desde, boletos}]).
--      - monto_minimo: factura minima para participar.
--      - max_boletos_factura: tope de boletos por factura (null = sin tope).
--      - base_calculo: TOTAL (con ITBIS) o SUBTOTAL (sin ITBIS).
--      - aplica_contado / aplica_credito / solo_pagadas: condiciones.
--  * Permiso mnt.concursos (Mantenimientos > Usuario > Accesos).

begin;

create table if not exists myappdb.concurso (
  id                   bigserial primary key,
  codempresa           varchar(30) not null,
  codsucursal          int4,               -- null = todas las sucursales
  nombre               varchar(120) not null,
  tipo                 varchar(10) not null default 'RIFA',
  descripcion          text,
  premios              text,
  fecha_inicio         date not null,
  fecha_fin            date not null,
  activo               boolean not null default false,
  modo                 varchar(10) not null default 'MULTIPLO',
  monto_por_boleto     numeric(14,2) not null default 0,
  monto_minimo         numeric(14,2) not null default 0,
  max_boletos_factura  int4,
  rangos               jsonb not null default '[]'::jsonb,
  base_calculo         varchar(10) not null default 'TOTAL',
  aplica_contado       boolean not null default true,
  aplica_credito       boolean not null default true,
  solo_pagadas         boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  created_by           text,
  updated_by           text,
  constraint chk_concurso_fechas check (fecha_fin >= fecha_inicio),
  constraint chk_concurso_tipo check (tipo in ('RIFA', 'SORTEO')),
  constraint chk_concurso_modo check (modo in ('MULTIPLO', 'RANGO')),
  constraint chk_concurso_base check (base_calculo in ('TOTAL', 'SUBTOTAL')),
  constraint chk_concurso_montos check (
    monto_por_boleto >= 0 and monto_minimo >= 0
    and (max_boletos_factura is null or max_boletos_factura > 0)
  ),
  constraint chk_concurso_multiplo check (modo <> 'MULTIPLO' or monto_por_boleto > 0),
  constraint chk_concurso_rangos check (jsonb_typeof(rangos) = 'array')
);

comment on table myappdb.concurso is 'Rifas / sorteos: reglas para entregar boletos por valor de factura.';

create index if not exists idx_concurso_empresa_vigencia
  on myappdb.concurso (codempresa, activo, fecha_inicio, fecha_fin);

create or replace function myappdb.set_concurso_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), current_user);
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, new.updated_by);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_concurso_updated_at on myappdb.concurso;
create trigger trg_concurso_updated_at
before insert or update on myappdb.concurso
for each row execute function myappdb.set_concurso_updated_at();

grant select, insert, update, delete on table myappdb.concurso to authenticated;
grant usage, select on sequence myappdb.concurso_id_seq to authenticated;

-- RLS: se ve en la empresa (y sucursal si aplica); solo root/admin o quien
-- tenga el permiso de Rifa/Sorteo puede crear, editar o eliminar.
alter table myappdb.concurso enable row level security;

drop policy if exists concurso_select_tenant on myappdb.concurso;
drop policy if exists concurso_insert_tenant on myappdb.concurso;
drop policy if exists concurso_update_tenant on myappdb.concurso;
drop policy if exists concurso_delete_tenant on myappdb.concurso;

create policy concurso_select_tenant on myappdb.concurso
for select to authenticated
using (app_private.can_access_row(codempresa::text, codsucursal::text, null, null));

create policy concurso_insert_tenant on myappdb.concurso
for insert to authenticated
with check (
  app_private.can_access_row(codempresa::text, null, null, null)
  and (
    app_private.is_root() or app_private.is_admin()
    or app_private.has_permission('mnt.concursos', 'crear')
  )
);

create policy concurso_update_tenant on myappdb.concurso
for update to authenticated
using (
  app_private.can_access_row(codempresa::text, null, null, null)
  and (
    app_private.is_root() or app_private.is_admin()
    or app_private.has_permission('mnt.concursos', 'editar')
  )
)
with check (app_private.can_access_row(codempresa::text, null, null, null));

create policy concurso_delete_tenant on myappdb.concurso
for delete to authenticated
using (
  app_private.can_access_row(codempresa::text, null, null, null)
  and (
    app_private.is_root() or app_private.is_admin()
    or app_private.has_permission('mnt.concursos', 'eliminar')
  )
);

-- Permisos ---------------------------------------------------------------
insert into myappdb.permiso_recurso_catalogo
  (modulo_key, modulo_nombre, recurso_key, pantalla_nombre, ruta, activo, requiere_tenant, orden)
values
  ('mantenimientos', 'Mantenimientos', 'mnt.concursos', 'Rifa / Sorteo',
   '/private/mantenimientos/concursos', true, true, 133)
on conflict (recurso_key) do update
set modulo_key = excluded.modulo_key,
    modulo_nombre = excluded.modulo_nombre,
    pantalla_nombre = excluded.pantalla_nombre,
    ruta = excluded.ruta,
    activo = excluded.activo,
    requiere_tenant = excluded.requiere_tenant,
    orden = excluded.orden;

insert into myappdb.permiso_recurso_accion_catalogo (recurso_key, accion_key, activo)
values
  ('mnt.concursos', 'ver', true),
  ('mnt.concursos', 'crear', true),
  ('mnt.concursos', 'editar', true),
  ('mnt.concursos', 'eliminar', true)
on conflict (recurso_key, accion_key) do update
set activo = excluded.activo;

commit;

notify pgrst, 'reload schema';
