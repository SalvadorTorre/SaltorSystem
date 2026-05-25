begin;

-- 1) Indices clave para rendimiento
create index if not exists idx_productos2_in_codmerc
  on myappdb.productos2 (in_codmerc);

create unique index if not exists idx_30244_sucursal_producto
  on myappdb.inventario (inv_codsucu, inv_codprod);

create index if not exists idx_inventario_codsucu_codprod
  on myappdb.inventario (inv_codsucu, inv_codprod);

-- 2) Trigger de auditoria con bypass para seeds masivos
create or replace function myappdb.trg_inventario_audit()
returns trigger
language plpgsql
as $$
declare
  v_user text;
  v_prod_id int;
begin
  if current_setting('myappdb.skip_inventario_audit', true) = 'on' then
    return null;
  end if;

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

-- 3) Limpiar firmas viejas si existen
drop function if exists myappdb.seed_inventario_sucursal_desde_catalogo(integer, boolean, numeric);
drop function if exists myappdb.seed_inventario_sucursal_desde_catalogo(integer, boolean, numeric, integer);
drop function if exists myappdb.seed_inventario_sucursal_desde_catalogo(integer, boolean, numeric, integer, integer);

-- 4) RPC final: procesa por cursor de id para evitar timeout
create or replace function myappdb.seed_inventario_sucursal_desde_catalogo(
  p_inv_codsucu integer,
  p_sobrescribir_existentes boolean default false,
  p_existencia_inicial numeric default 0,
  p_batch_size integer default 250,
  p_after_id integer default 0
)
returns jsonb
language plpgsql
as $$
declare
  v_total_catalogo integer := 0;
  v_total_antes integer := 0;
  v_total_despues integer := 0;
  v_insertados integer := 0;
  v_procesados integer := 0;
  v_ultimo_id integer := 0;
begin
  if p_inv_codsucu is null or p_inv_codsucu <= 0 then
    raise exception 'Sucursal invalida para sembrar inventario';
  end if;

  perform set_config('statement_timeout', '0', true);

  select count(*)
    into v_total_catalogo
  from myappdb.productos2 p
  where p.in_codmerc is not null
    and btrim(p.in_codmerc) <> '';

  select count(*)
    into v_total_antes
  from myappdb.inventario i
  where i.inv_codsucu = p_inv_codsucu;

  if p_sobrescribir_existentes and coalesce(p_after_id, 0) = 0 then
    delete from myappdb.inventario
    where inv_codsucu = p_inv_codsucu;

    v_total_antes := 0;
  end if;

  perform set_config('myappdb.skip_inventario_audit', 'on', true);

  with lote_productos as (
    select
      p.id,
      p.in_codmerc,
      p.in_desmerc,
      p.in_costmer,
      p.in_premerc,
      p.status
    from myappdb.productos2 p
    where p.id > greatest(coalesce(p_after_id, 0), 0)
      and p.in_codmerc is not null
      and btrim(p.in_codmerc) <> ''
    order by p.id
    limit greatest(coalesce(p_batch_size, 250), 1)
  ),
  candidatos as (
    select
      lp.id,
      p_inv_codsucu as inv_codsucu,
      btrim(lp.in_codmerc) as inv_codprod,
      nullif(btrim(coalesce(lp.in_desmerc, '')), '') as inv_desprod,
      lp.in_costmer as inv_cosprod,
      lp.in_premerc as inv_preprod,
      coalesce(p_existencia_inicial, 0) as inv_existencia,
      now() as inv_fechamov,
      upper(coalesce(lp.status, 'A')) <> 'I' as activo
    from lote_productos lp
    left join myappdb.inventario i
      on i.inv_codsucu = p_inv_codsucu
     and i.inv_codprod = btrim(lp.in_codmerc)
    where i.inv_codprod is null
  ),
  insertados_rows as (
    insert into myappdb.inventario (
      inv_codsucu,
      inv_codprod,
      inv_desprod,
      inv_cosprod,
      inv_preprod,
      inv_existencia,
      inv_fechamov,
      activo
    )
    select
      c.inv_codsucu,
      c.inv_codprod,
      c.inv_desprod,
      c.inv_cosprod,
      c.inv_preprod,
      c.inv_existencia,
      c.inv_fechamov,
      c.activo
    from candidatos c
    on conflict (inv_codsucu, inv_codprod) do nothing
    returning 1
  )
  select
    coalesce((select count(*) from insertados_rows), 0)::integer,
    coalesce((select count(*) from lote_productos), 0)::integer,
    coalesce((select max(id) from lote_productos), 0)::integer
  into v_insertados, v_procesados, v_ultimo_id;

  perform set_config('myappdb.skip_inventario_audit', 'off', true);

  select count(*)
    into v_total_despues
  from myappdb.inventario i
  where i.inv_codsucu = p_inv_codsucu;

  return jsonb_build_object(
    'sucursal', p_inv_codsucu,
    'totalCatalogo', v_total_catalogo,
    'totalAntes', v_total_antes,
    'totalDespues', v_total_despues,
    'insertados', v_insertados,
    'procesados', v_procesados,
    'ultimoId', v_ultimo_id,
    'faltantes', greatest(v_total_catalogo - v_total_despues, 0),
    'modo', case when p_sobrescribir_existentes then 'reemplazo' else 'faltantes' end
  );
end;
$$;

grant execute on function myappdb.seed_inventario_sucursal_desde_catalogo(integer, boolean, numeric, integer, integer)
to anon, authenticated, service_role;

-- 5) RPC de resumen por sucursal
drop function if exists myappdb.resumen_inventario_sucursales(integer[]);

create or replace function myappdb.resumen_inventario_sucursales(
  p_ids integer[] default null
)
returns table (
  inv_codsucu integer,
  totalinventario integer,
  faltantes integer,
  totalcatalogo integer
)
language sql
as $$
  with catalogo as (
    select count(*)::integer as total
    from myappdb.productos2 p
    where p.in_codmerc is not null
      and btrim(p.in_codmerc) <> ''
  ),
  inventario_agrupado as (
    select
      i.inv_codsucu,
      count(distinct i.inv_codprod)::integer as totalinventario
    from myappdb.inventario i
    where p_ids is null
       or cardinality(p_ids) = 0
       or i.inv_codsucu = any(p_ids)
    group by i.inv_codsucu
  )
  select
    ia.inv_codsucu,
    ia.totalinventario,
    greatest(c.total - ia.totalinventario, 0)::integer as faltantes,
    c.total::integer as totalcatalogo
  from inventario_agrupado ia
  cross join catalogo c
  order by ia.inv_codsucu;
$$;

grant execute on function myappdb.resumen_inventario_sucursales(integer[])
to anon, authenticated, service_role;

commit;

notify pgrst, 'reload schema';
