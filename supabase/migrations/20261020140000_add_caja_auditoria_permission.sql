-- Permisos para "Auditoria de caja" (menu Caja), visibles en
-- Mantenimientos > Usuario > Accesos por modulo > Caja.
--   * Facturas por cerrar: Cobro Factura en solo lectura.
--   * Historial de cierres: Consulta de cierres de Cuadre Caja.
-- Son pantallas de consulta: solo se habilitan las acciones ver / imprimir.

insert into myappdb.permiso_recurso_catalogo
  (modulo_key, modulo_nombre, recurso_key, pantalla_nombre, ruta, activo, requiere_tenant, orden)
values
  ('caja', 'Caja', 'caja.auditoria_facturas_por_cerrar', 'Auditoría de caja · Facturas por cerrar',
   '/private/caja/auditoria/facturas-por-cerrar', true, true, 74),
  ('caja', 'Caja', 'caja.auditoria_historial_cierres', 'Auditoría de caja · Historial de cierres',
   '/private/caja/auditoria/historial-cierres', true, true, 75)
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
  ('caja.auditoria_facturas_por_cerrar', 'ver', true),
  ('caja.auditoria_historial_cierres', 'ver', true),
  ('caja.auditoria_historial_cierres', 'imprimir', true)
on conflict (recurso_key, accion_key) do update
set activo = excluded.activo;

update myappdb.permiso_recurso_accion_catalogo
set activo = false
where (recurso_key = 'caja.auditoria_facturas_por_cerrar' and accion_key <> 'ver')
   or (recurso_key = 'caja.auditoria_historial_cierres' and accion_key not in ('ver', 'imprimir'));

notify pgrst, 'reload schema';
