-- Devuelve el resumen de inventario por sucursal usando agregacion SQL
-- para evitar timeouts al traer demasiadas filas al cliente.

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
