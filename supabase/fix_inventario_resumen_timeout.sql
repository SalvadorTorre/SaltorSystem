-- Fix no destructivo para el timeout del resumen de inventario por sucursal.
-- No borra datos. Solo crea indices y reemplaza el RPC de lectura.

create index if not exists idx_inventario_inv_codsucu_codprod
  on myappdb.inventario (inv_codsucu, inv_codprod);

create index if not exists idx_productos2_in_codmerc_not_empty
  on myappdb.productos2 (in_codmerc)
  where in_codmerc is not null and btrim(in_codmerc) <> '';

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
stable
security definer
set search_path = myappdb, public
as $$
  with requested_sucursales as (
    select distinct unnest(coalesce(p_ids, array[]::integer[]))::integer as inv_codsucu
  ),
  catalogo as (
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
  ),
  base as (
    select inv_codsucu from requested_sucursales
    union
    select inv_codsucu from inventario_agrupado
  )
  select
    b.inv_codsucu,
    coalesce(ia.totalinventario, 0)::integer as totalinventario,
    greatest(c.total - coalesce(ia.totalinventario, 0), 0)::integer as faltantes,
    c.total::integer as totalcatalogo
  from base b
  cross join catalogo c
  left join inventario_agrupado ia on ia.inv_codsucu = b.inv_codsucu
  order by b.inv_codsucu;
$$;

revoke all on function myappdb.resumen_inventario_sucursales(integer[]) from public;
grant execute on function myappdb.resumen_inventario_sucursales(integer[]) to authenticated, service_role;
