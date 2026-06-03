-- Ejecutar en Supabase SQL Editor para diagnosticar el error PGRST202.
-- Debe devolver una fila en public con estos argumentos:
-- p_codigo text, p_marcar_fpago boolean, p_marcar_det_pagado boolean

select
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname = 'mobile_cerrar_factura_app'
order by n.nspname, arguments;

-- Si la funcion aparece pero la app sigue diciendo PGRST202,
-- recarga el cache de PostgREST:
notify pgrst, 'reload schema';
