-- Permite que /almacen/controlfact edite una factura y reemplace su detalle.
-- El acceso sigue limitado al tenant y a la sucursal del usuario autenticado.

drop policy if exists factura_update_permiso on myappdb.factura;

create policy factura_update_permiso
on myappdb.factura
for update
to authenticated
using (
  app_private.current_usuario_tenant_ok(fa_codempr::text, fa_codsucu::text)
  and app_private.has_any_permission(
    '[
      {"recurso":"facturacion.factura","accion":"editar"},
      {"recurso":"facturacion.factura","accion":"enviar_dgii"},
      {"recurso":"caja.cobrofact","accion":"cobrar"},
      {"recurso":"caja.cobrofact","accion":"enviar_dgii"},
      {"recurso":"almacen.salidafactura","accion":"crear"},
      {"recurso":"almacen.salidafactura","accion":"editar"},
      {"recurso":"almacen.controlfact","accion":"editar"}
    ]'::jsonb,
    fa_codempr::text,
    fa_codsucu::text
  )
)
with check (
  app_private.current_usuario_tenant_ok(fa_codempr::text, fa_codsucu::text)
  and app_private.has_any_permission(
    '[
      {"recurso":"facturacion.factura","accion":"editar"},
      {"recurso":"facturacion.factura","accion":"enviar_dgii"},
      {"recurso":"caja.cobrofact","accion":"cobrar"},
      {"recurso":"caja.cobrofact","accion":"enviar_dgii"},
      {"recurso":"almacen.salidafactura","accion":"crear"},
      {"recurso":"almacen.salidafactura","accion":"editar"},
      {"recurso":"almacen.controlfact","accion":"editar"}
    ]'::jsonb,
    fa_codempr::text,
    fa_codsucu::text
  )
);

drop policy if exists detfactura_insert_permiso on myappdb.detfactura;

create policy detfactura_insert_permiso
on myappdb.detfactura
for insert
to authenticated
with check (
  app_private.current_usuario_tenant_ok(df_codepr::text, df_codsucu::text)
  and app_private.has_any_permission(
    '[
      {"recurso":"facturacion.factura","accion":"crear"},
      {"recurso":"facturacion.factura","accion":"editar"},
      {"recurso":"almacen.controlfact","accion":"editar"}
    ]'::jsonb,
    df_codepr::text,
    df_codsucu::text
  )
);
