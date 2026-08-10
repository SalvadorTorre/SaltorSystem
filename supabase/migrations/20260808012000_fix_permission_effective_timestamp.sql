-- Los permisos creados durante el dia deben activarse inmediatamente.
-- La funcion anterior comparaba timestamptz con current_date (medianoche),
-- dejando inactivo hasta el dia siguiente cualquier permiso creado hoy.
do $migration$
declare
  function_definition text;
begin
  select pg_get_functiondef(
    'app_private.has_permission(text,text,text,text)'::regprocedure
  )
  into function_definition;

  function_definition := replace(
    function_definition,
    'upa.vigencia_desde <= current_date',
    'upa.vigencia_desde <= statement_timestamp()'
  );
  function_definition := replace(
    function_definition,
    'upa.vigencia_hasta >= current_date',
    'upa.vigencia_hasta >= statement_timestamp()'
  );

  if position('upa.vigencia_desde <= statement_timestamp()' in function_definition) = 0
     or position('upa.vigencia_hasta >= statement_timestamp()' in function_definition) = 0 then
    raise exception 'No se pudo actualizar la validacion de vigencia en app_private.has_permission';
  end if;

  execute function_definition;
end
$migration$;
