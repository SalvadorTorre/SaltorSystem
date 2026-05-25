-- Garantiza una sola fila de inventario por combinacion producto + sucursal.
-- Antes de crear la restriccion, elimina duplicados quedandose con la fila de mayor id.

delete from public.inventario a
using public.inventario b
where a.id < b.id
  and a.inv_codsucu = b.inv_codsucu
  and a.inv_codprod = b.inv_codprod;

create unique index if not exists inventario_inv_codsucu_inv_codprod_uidx
  on public.inventario (inv_codsucu, inv_codprod);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'inventario_inv_codsucu_inv_codprod_unique'
  ) then
    alter table public.inventario
      add constraint inventario_inv_codsucu_inv_codprod_unique
      unique using index inventario_inv_codsucu_inv_codprod_uidx;
  end if;
end $$;
