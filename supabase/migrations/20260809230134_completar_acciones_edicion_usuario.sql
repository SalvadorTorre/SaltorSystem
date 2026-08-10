-- Completa las acciones CRUD que se pueden asignar individualmente
-- a cada pantalla desde Mantenimiento > Usuario.
insert into myappdb.permiso_accion_catalogo
  (accion_key, descripcion, orden, activo)
values
  ('ver', 'Consultar', 10, true),
  ('crear', 'Insertar / Crear', 20, true),
  ('editar', 'Editar', 30, true),
  ('eliminar', 'Eliminar', 40, true),
  ('guardar', 'Guardar', 45, true)
on conflict (accion_key) do update
set descripcion = excluded.descripcion,
    orden = excluded.orden,
    activo = excluded.activo;

insert into myappdb.permiso_recurso_accion_catalogo
  (recurso_key, accion_key, activo)
select recurso.recurso_key, accion.accion_key, true
from myappdb.permiso_recurso_catalogo recurso
cross join (
  values ('ver'), ('crear'), ('editar'), ('eliminar'), ('guardar')
) as accion(accion_key)
where recurso.activo = true
on conflict (recurso_key, accion_key) do update
set activo = excluded.activo;
