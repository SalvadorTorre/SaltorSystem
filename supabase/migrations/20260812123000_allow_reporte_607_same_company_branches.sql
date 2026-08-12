-- Permite que el Reporte 607 consulte cualquier sucursal de la empresa
-- asignada al usuario, sin permitir acceso a empresas distintas.
do $migration$
declare
  function_definition text;
begin
  select pg_get_functiondef(p.oid)
    into function_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'myappdb'
    and p.proname = 'listar_reporte_607'
    and pg_get_function_identity_arguments(p.oid) =
      'p_page integer, p_page_size integer, p_search text, p_fecha date, p_fecha_desde date, p_fecha_hasta date, p_tipo_comprobante integer, p_estado_dgii text, p_empresa text, p_sucursal integer'
  limit 1;

  if function_definition is null then
    raise exception 'No se encontro myappdb.listar_reporte_607 con la firma esperada';
  end if;

  function_definition := replace(
    function_definition,
    'AND (v_is_admin OR f.fa_codsucu = cu.sucursalid)',
    ''
  );

  if position('v_is_admin OR f.fa_codsucu = cu.sucursalid' in function_definition) > 0 then
    raise exception 'No se pudo actualizar el alcance por sucursal de listar_reporte_607';
  end if;

  execute function_definition;
end
$migration$;
