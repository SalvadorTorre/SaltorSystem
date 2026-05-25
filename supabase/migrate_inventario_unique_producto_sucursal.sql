-- Garantiza una sola fila de inventario por combinacion producto + sucursal.
-- Schema real del proyecto: myappdb.
-- Antes de crear la restriccion, elimina duplicados quedandose con la fila de mayor id.

delete from myappdb.inventario a
using myappdb.inventario b
where a.id < b.id
  and a.inv_codsucu = b.inv_codsucu
  and a.inv_codprod = b.inv_codprod;

do $$
begin
  if exists (
    select 1
    from pg_indexes
    where schemaname = 'myappdb'
      and indexname in (
        'idx_30244_sucursal_producto',
        'inventario_inv_codsucu_inv_codprod_uidx'
      )
  ) then
    raise notice 'Inventario ya tiene un indice unico por sucursal + producto.';
  else
    create unique index inventario_inv_codsucu_inv_codprod_uidx
      on myappdb.inventario (inv_codsucu, inv_codprod);
  end if;
end $$;
