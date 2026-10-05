insert into myappdb.permiso_recurso_catalogo
  (modulo_key, modulo_nombre, recurso_key, pantalla_nombre, ruta, activo, requiere_tenant, orden)
values
  ('almacen', 'Almacén', 'almacen.nota_credito', 'Nota de Crédito',
   '/private/almacen/nota-credito', true, true, 89)
on conflict (recurso_key) do update
set modulo_key = excluded.modulo_key,
    modulo_nombre = excluded.modulo_nombre,
    pantalla_nombre = excluded.pantalla_nombre,
    ruta = excluded.ruta,
    activo = excluded.activo,
    requiere_tenant = excluded.requiere_tenant,
    orden = excluded.orden;

insert into myappdb.permiso_recurso_accion_catalogo (recurso_key, accion_key, activo)
values
  ('almacen.nota_credito', 'ver', true),
  ('almacen.nota_credito', 'imprimir', true)
on conflict (recurso_key, accion_key) do update
set activo = excluded.activo;

-- Esta pantalla es exclusivamente de consulta e impresión. Si el recurso ya
-- existía, se desactivan acciones incompatibles para no mostrarlas al usuario.
update myappdb.permiso_recurso_accion_catalogo
set activo = false
where recurso_key = 'almacen.nota_credito'
  and accion_key not in ('ver', 'imprimir');
