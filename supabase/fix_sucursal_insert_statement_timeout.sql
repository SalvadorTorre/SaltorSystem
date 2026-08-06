-- Corrige el timeout al crear sucursales desde /mantenimientos/Empresas.
-- El trigger antiguo copiaba todo el catalogo de inventario dentro del INSERT
-- de la sucursal. La aplicacion ya ejecuta el seed optimizado despues de que
-- la sucursal queda guardada, por lo que el trigger resulta duplicado.

begin;

drop trigger if exists ai_seed_inv_sucursal on myappdb.sucursales;

-- Se conserva la funcion por compatibilidad, pero ya no se ejecuta
-- automaticamente dentro de la transaccion que crea la sucursal.

notify pgrst, 'reload schema';

commit;
