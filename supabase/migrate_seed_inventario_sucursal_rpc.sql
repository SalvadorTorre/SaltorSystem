-- Carga todos los productos faltantes de productos2 hacia inventario
-- para una sucursal especifica, ejecutando la operacion del lado SQL
-- para evitar el limite de 1000 filas del cliente.

create or replace function myappdb.seed_inventario_sucursal_desde_catalogo(
  p_inv_codsucu integer,
  p_sobrescribir_existentes boolean default false,
  p_existencia_inicial numeric default 0
)
returns jsonb
language plpgsql
as $$
declare
  v_total_catalogo integer := 0;
  v_total_antes integer := 0;
  v_total_despues integer := 0;
  v_insertados integer := 0;
begin
  if p_inv_codsucu is null or p_inv_codsucu <= 0 then
    raise exception 'Sucursal invalida para sembrar inventario';
  end if;

  select count(*)
    into v_total_catalogo
  from myappdb.productos2 p
  where p.in_codmerc is not null
    and btrim(p.in_codmerc) <> '';

  select count(distinct i.inv_codprod)
    into v_total_antes
  from myappdb.inventario i
  where i.inv_codsucu = p_inv_codsucu;

  if p_sobrescribir_existentes then
    delete from myappdb.inventario
    where inv_codsucu = p_inv_codsucu;

    v_total_antes := 0;
  end if;

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
    p_inv_codsucu,
    btrim(p.in_codmerc),
    nullif(btrim(coalesce(p.in_desmerc, '')), ''),
    p.in_costmer,
    p.in_premerc,
    coalesce(p_existencia_inicial, 0),
    now(),
    upper(coalesce(p.status, 'A')) <> 'I'
  from myappdb.productos2 p
  left join myappdb.inventario i
    on i.inv_codsucu = p_inv_codsucu
   and i.inv_codprod = btrim(p.in_codmerc)
  where p.in_codmerc is not null
    and btrim(p.in_codmerc) <> ''
    and (p_sobrescribir_existentes or i.inv_codprod is null);

  get diagnostics v_insertados = row_count;

  select count(distinct i.inv_codprod)
    into v_total_despues
  from myappdb.inventario i
  where i.inv_codsucu = p_inv_codsucu;

  return jsonb_build_object(
    'sucursal', p_inv_codsucu,
    'totalCatalogo', v_total_catalogo,
    'totalAntes', v_total_antes,
    'totalDespues', v_total_despues,
    'insertados', v_insertados,
    'faltantes', greatest(v_total_catalogo - v_total_despues, 0),
    'modo', case when p_sobrescribir_existentes then 'reemplazo' else 'faltantes' end
  );
end;
$$;
