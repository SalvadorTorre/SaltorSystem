-- Permite reemplazar los detalles de una factura durante edición.
-- Antes solo se podía borrar detfactura con permiso de anular; al editar,
-- el servicio borra los detalles anteriores e inserta los detalles actuales.
drop policy if exists detfactura_delete_permiso on myappdb.detfactura;

create policy detfactura_delete_permiso
on myappdb.detfactura
for delete
to authenticated
using (
  app_private.current_usuario_tenant_ok((df_codepr)::text, (df_codsucu)::text)
  and app_private.has_any_permission(
    '[
      {"accion": "anular", "recurso": "facturacion.factura"},
      {"accion": "editar", "recurso": "facturacion.factura"},
      {"accion": "anular", "recurso": "almacen.controlfact"},
      {"accion": "editar", "recurso": "almacen.controlfact"}
    ]'::jsonb,
    (df_codepr)::text,
    (df_codsucu)::text
  )
);
