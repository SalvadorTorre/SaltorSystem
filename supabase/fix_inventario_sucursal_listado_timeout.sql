-- Fix no destructivo para listar inventario de una sucursal sin timeout.
-- No borra datos. Crea indices y un RPC paginado de lectura.

create index if not exists idx_inventario_sucursal_codprod_order
  on myappdb.inventario (inv_codsucu, inv_codprod);

create index if not exists idx_inventario_sucursal_desprod
  on myappdb.inventario (inv_codsucu, inv_desprod);

drop function if exists myappdb.listar_inventario_sucursal(integer, integer, integer, text, text);

create or replace function myappdb.listar_inventario_sucursal(
  p_inv_codsucu integer,
  p_limit integer default 15,
  p_offset integer default 0,
  p_codigo text default null,
  p_descripcion text default null
)
returns table (
  id integer,
  inv_codsucu integer,
  inv_codprod varchar,
  inv_desprod varchar,
  inv_cosprod numeric,
  inv_preprod numeric,
  inv_existencia numeric,
  inv_fechamov timestamp without time zone,
  activo boolean,
  inv_updated_at timestamptz,
  inv_updated_by text,
  total_count bigint
)
language sql
stable
security definer
set search_path = myappdb, public
as $$
  with filtered as (
    select i.*
    from myappdb.inventario i
    where i.inv_codsucu = p_inv_codsucu
      and (
        coalesce(btrim(p_codigo), '') = ''
        or i.inv_codprod ilike ('%' || btrim(p_codigo) || '%')
      )
      and (
        coalesce(btrim(p_descripcion), '') = ''
        or i.inv_desprod ilike ('%' || btrim(p_descripcion) || '%')
      )
  ),
  counted as (
    select count(*)::bigint as total from filtered
  )
  select
    f.id,
    f.inv_codsucu,
    f.inv_codprod,
    f.inv_desprod,
    f.inv_cosprod,
    f.inv_preprod,
    f.inv_existencia,
    f.inv_fechamov,
    f.activo,
    f.inv_updated_at,
    f.inv_updated_by,
    c.total as total_count
  from filtered f
  cross join counted c
  order by f.inv_codprod asc
  limit greatest(coalesce(p_limit, 15), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function myappdb.listar_inventario_sucursal(integer, integer, integer, text, text) from public;
grant execute on function myappdb.listar_inventario_sucursal(integer, integer, integer, text, text) to authenticated, service_role;
