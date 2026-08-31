insert into myappdb.permiso_recurso_catalogo
  (modulo_key, modulo_nombre, recurso_key, pantalla_nombre, ruta, activo, requiere_tenant, orden)
values
  ('contabilidad', 'Contabilidad', 'contabilidad.gastos_menores', 'Gastos menores',
   '/private/contabilidad/gastos-menores', true, true, 139)
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
  ('contabilidad.gastos_menores', 'ver', true),
  ('contabilidad.gastos_menores', 'crear', true),
  ('contabilidad.gastos_menores', 'editar', true),
  ('contabilidad.gastos_menores', 'imprimir', true),
  ('contabilidad.gastos_menores', 'enviar_dgii', true)
on conflict (recurso_key, accion_key) do update
set activo = excluded.activo;
