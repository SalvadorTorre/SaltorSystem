begin;

-- =========================================================
-- Inventario por sucursal usando estructura EXISTENTE
--   productos2.id (PK)
--   productos2.in_codmerc (codigo producto)
--   productos2.in_costmer (costo global real)
--   sucursales.cod_sucursal (PK)
--   inventario(inv_codsucu, inv_codprod) (unique existente)
-- =========================================================

-- 1) Extender inventario con campos operativos
alter table if exists myappdb.inventario
  add column if not exists activo boolean not null default true;

alter table if exists myappdb.inventario
  add column if not exists inv_updated_at timestamptz not null default now();

alter table if exists myappdb.inventario
  add column if not exists inv_updated_by text;

-- 2) Tabla de auditoria de costos/inventario
create table if not exists myappdb.log_costos_inventario (
  id              bigserial primary key,
  origen          text not null, -- productos2 | inventario
  accion          text not null, -- INSERT | UPDATE | DELETE
  producto_id     int null,
  inv_codprod     varchar(20) null,
  cod_sucursal    int null,
  campo           text null,
  valor_anterior  text null,
  valor_nuevo     text null,
  usuario         text null,
  fecha_hora      timestamptz not null default now()
);

create index if not exists idx_log_costos_fecha
  on myappdb.log_costos_inventario (fecha_hora desc);

create index if not exists idx_log_costos_producto
  on myappdb.log_costos_inventario (inv_codprod, cod_sucursal);

-- 3) Helper: usuario actor (jwt -> email, fallback sistema)
create or replace function myappdb._actor_usuario()
returns text
language plpgsql
stable
as $$
declare
  v_claims text;
  v_json jsonb;
  v_user text;
begin
  v_claims := current_setting('request.jwt.claims', true);
  if v_claims is null or btrim(v_claims) = '' then
    return 'sistema';
  end if;

  begin
    v_json := v_claims::jsonb;
  exception when others then
    return 'sistema';
  end;

  v_user := nullif(v_json->>'email', '');
  if v_user is null then
    v_user := nullif(v_json->>'idusuario', '');
  end if;
  if v_user is null then
    v_user := 'sistema';
  end if;
  return v_user;
end;
$$;

-- 4) Trigger metadata inventario
create or replace function myappdb.trg_inventario_meta()
returns trigger
language plpgsql
as $$
begin
  new.inv_updated_at := now();
  new.inv_updated_by := myappdb._actor_usuario();
  if tg_op = 'INSERT' then
    new.inv_fechamov := coalesce(new.inv_fechamov, now());
  end if;
  return new;
end;
$$;

drop trigger if exists bui_inventario_meta on myappdb.inventario;
create trigger bui_inventario_meta
before insert or update on myappdb.inventario
for each row execute function myappdb.trg_inventario_meta();

-- 5) Trigger auditoria inventario (costo local/existencia/activo)
create or replace function myappdb.trg_inventario_audit()
returns trigger
language plpgsql
as $$
declare
  v_user text;
  v_prod_id int;
begin
  v_user := myappdb._actor_usuario();

  select p.id
  into v_prod_id
  from myappdb.productos2 p
  where p.in_codmerc = coalesce(new.inv_codprod, old.inv_codprod)
  limit 1;

  if tg_op = 'INSERT' then
    insert into myappdb.log_costos_inventario(
      origen, accion, producto_id, inv_codprod, cod_sucursal, campo, valor_nuevo, usuario
    ) values (
      'inventario', 'INSERT', v_prod_id, new.inv_codprod, new.inv_codsucu, 'row', row_to_json(new)::text, v_user
    );
    return null;
  end if;

  if tg_op = 'UPDATE' then
    if old.inv_cosprod is distinct from new.inv_cosprod then
      insert into myappdb.log_costos_inventario(
        origen, accion, producto_id, inv_codprod, cod_sucursal, campo, valor_anterior, valor_nuevo, usuario
      ) values (
        'inventario', 'UPDATE', v_prod_id, new.inv_codprod, new.inv_codsucu,
        'inv_cosprod', old.inv_cosprod::text, new.inv_cosprod::text, v_user
      );
    end if;

    if old.inv_existencia is distinct from new.inv_existencia then
      insert into myappdb.log_costos_inventario(
        origen, accion, producto_id, inv_codprod, cod_sucursal, campo, valor_anterior, valor_nuevo, usuario
      ) values (
        'inventario', 'UPDATE', v_prod_id, new.inv_codprod, new.inv_codsucu,
        'inv_existencia', old.inv_existencia::text, new.inv_existencia::text, v_user
      );
    end if;

    if old.activo is distinct from new.activo then
      insert into myappdb.log_costos_inventario(
        origen, accion, producto_id, inv_codprod, cod_sucursal, campo, valor_anterior, valor_nuevo, usuario
      ) values (
        'inventario', 'UPDATE', v_prod_id, new.inv_codprod, new.inv_codsucu,
        'activo', old.activo::text, new.activo::text, v_user
      );
    end if;
    return null;
  end if;

  if tg_op = 'DELETE' then
    insert into myappdb.log_costos_inventario(
      origen, accion, producto_id, inv_codprod, cod_sucursal, campo, valor_anterior, usuario
    ) values (
      'inventario', 'DELETE', v_prod_id, old.inv_codprod, old.inv_codsucu, 'row', row_to_json(old)::text, v_user
    );
    return null;
  end if;

  return null;
end;
$$;

drop trigger if exists aud_inventario_costos on myappdb.inventario;
create trigger aud_inventario_costos
after insert or update or delete on myappdb.inventario
for each row execute function myappdb.trg_inventario_audit();

-- 6) Trigger auditoria costo global en productos2 (columna real: in_costmer)
create or replace function myappdb.trg_producto_costo_global_audit()
returns trigger
language plpgsql
as $$
declare
  v_user text;
begin
  v_user := myappdb._actor_usuario();

  if old.in_costmer is distinct from new.in_costmer then
    insert into myappdb.log_costos_inventario(
      origen, accion, producto_id, inv_codprod, cod_sucursal, campo, valor_anterior, valor_nuevo, usuario
    ) values (
      'productos2', 'UPDATE', new.id, new.in_codmerc, null,
      'in_costmer', old.in_costmer::text, new.in_costmer::text, v_user
    );
  end if;

  return new;
end;
$$;

drop trigger if exists aud_productos2_costoglobal on myappdb.productos2;
create trigger aud_productos2_costoglobal
after update of in_costmer on myappdb.productos2
for each row execute function myappdb.trg_producto_costo_global_audit();

-- 7) Seed inicial para todas las sucursales/productos faltantes
insert into myappdb.inventario (
  inv_codsucu, inv_codprod, inv_desprod, inv_cosprod, inv_preprod, inv_existencia, inv_fechamov, activo, inv_updated_at, inv_updated_by
)
select
  s.cod_sucursal,
  p.in_codmerc,
  p.in_desmerc,
  p.in_costmer,
  p.in_premerc,
  coalesce(p.in_canmerc, 0),
  now(),
  true,
  now(),
  'seed'
from myappdb.sucursales s
join myappdb.productos2 p
  on p.in_codmerc is not null
 and btrim(p.in_codmerc) <> ''
left join myappdb.inventario i
  on i.inv_codsucu = s.cod_sucursal
 and i.inv_codprod = p.in_codmerc
where i.inv_codprod is null;

-- 8) Cuando se cree una sucursal, precargar inventario default
create or replace function myappdb.trg_seed_inventario_nueva_sucursal()
returns trigger
language plpgsql
as $$
begin
  insert into myappdb.inventario (
    inv_codsucu, inv_codprod, inv_desprod, inv_cosprod, inv_preprod, inv_existencia, inv_fechamov, activo, inv_updated_at, inv_updated_by
  )
  select
    new.cod_sucursal,
    p.in_codmerc,
    p.in_desmerc,
    p.in_costmer,
    p.in_premerc,
    0,
    now(),
    true,
    now(),
    'seed_sucursal'
  from myappdb.productos2 p
  where p.in_codmerc is not null
    and btrim(p.in_codmerc) <> '';

  return new;
end;
$$;

drop trigger if exists ai_seed_inv_sucursal on myappdb.sucursales;
create trigger ai_seed_inv_sucursal
after insert on myappdb.sucursales
for each row execute function myappdb.trg_seed_inventario_nueva_sucursal();

-- 9) Cuando se cree un producto, precargar en todas las sucursales
create or replace function myappdb.trg_seed_inventario_nuevo_producto()
returns trigger
language plpgsql
as $$
begin
  if new.in_codmerc is null or btrim(new.in_codmerc) = '' then
    return new;
  end if;

  insert into myappdb.inventario (
    inv_codsucu, inv_codprod, inv_desprod, inv_cosprod, inv_preprod, inv_existencia, inv_fechamov, activo, inv_updated_at, inv_updated_by
  )
  select
    s.cod_sucursal,
    new.in_codmerc,
    new.in_desmerc,
    new.in_costmer,
    new.in_premerc,
    0,
    now(),
    true,
    now(),
    'seed_producto'
  from myappdb.sucursales s
  left join myappdb.inventario i
    on i.inv_codsucu = s.cod_sucursal
   and i.inv_codprod = new.in_codmerc
  where i.inv_codprod is null;

  return new;
end;
$$;

drop trigger if exists ai_seed_inv_producto on myappdb.productos2;
create trigger ai_seed_inv_producto
after insert on myappdb.productos2
for each row execute function myappdb.trg_seed_inventario_nuevo_producto();

-- 10) Vista para detalle por sucursal (costo efectivo)
create or replace view myappdb.vw_producto_sucursal as
select
  p.id as producto_id,
  p.in_codmerc,
  p.in_desmerc,
  p.in_costmer as costo_global,
  p.in_premerc as precio_global,
  s.cod_sucursal,
  s.nom_sucursal,
  i.inv_existencia,
  i.inv_cosprod as costo_local,
  coalesce(i.inv_cosprod, p.in_costmer) as costo_efectivo,
  i.activo,
  i.inv_updated_at,
  i.inv_updated_by
from myappdb.productos2 p
join myappdb.sucursales s on true
left join myappdb.inventario i
  on i.inv_codsucu = s.cod_sucursal
 and i.inv_codprod = p.in_codmerc;

commit;

