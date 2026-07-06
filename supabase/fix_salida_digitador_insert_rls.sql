-- Corrige permisos RLS para que /almacen/salidafactura pueda registrar
-- controles de salida. salida.idusuario no siempre coincide con el usuario
-- autenticado, por eso el permiso debe validarse por sucursal y recurso.

DROP POLICY IF EXISTS rls_select_tenant ON myappdb.salida;
DROP POLICY IF EXISTS rls_insert_tenant ON myappdb.salida;
DROP POLICY IF EXISTS rls_update_tenant ON myappdb.salida;
DROP POLICY IF EXISTS rls_delete_tenant ON myappdb.salida;

CREATE POLICY rls_select_tenant
ON myappdb.salida
FOR SELECT
TO authenticated
USING (
  app_private.can_access_row(NULL::text, idsucursal::text, NULL::text, idusuario)
  OR (
    app_private.current_usuario_tenant_ok(NULL::text, idsucursal::text)
    AND app_private.has_any_permission(
      '[
        {"recurso":"almacen.salidafactura","accion":"ver"},
        {"recurso":"almacen.salidafactura","accion":"crear"},
        {"recurso":"almacen.salidafactura","accion":"editar"}
      ]'::jsonb,
      NULL::text,
      idsucursal::text
    )
  )
);

CREATE POLICY rls_insert_tenant
ON myappdb.salida
FOR INSERT
TO authenticated
WITH CHECK (
  app_private.can_access_row(NULL::text, idsucursal::text, NULL::text, idusuario)
  OR (
    app_private.current_usuario_tenant_ok(NULL::text, idsucursal::text)
    AND app_private.has_permission(
      'almacen.salidafactura',
      'crear',
      NULL::text,
      idsucursal::text
    )
  )
);

CREATE POLICY rls_update_tenant
ON myappdb.salida
FOR UPDATE
TO authenticated
USING (
  app_private.can_access_row(NULL::text, idsucursal::text, NULL::text, idusuario)
  OR (
    app_private.current_usuario_tenant_ok(NULL::text, idsucursal::text)
    AND app_private.has_any_permission(
      '[
        {"recurso":"almacen.salidafactura","accion":"editar"},
        {"recurso":"almacen.salidafactura","accion":"crear"}
      ]'::jsonb,
      NULL::text,
      idsucursal::text
    )
  )
)
WITH CHECK (
  app_private.can_access_row(NULL::text, idsucursal::text, NULL::text, idusuario)
  OR (
    app_private.current_usuario_tenant_ok(NULL::text, idsucursal::text)
    AND app_private.has_any_permission(
      '[
        {"recurso":"almacen.salidafactura","accion":"editar"},
        {"recurso":"almacen.salidafactura","accion":"crear"}
      ]'::jsonb,
      NULL::text,
      idsucursal::text
    )
  )
);

CREATE POLICY rls_delete_tenant
ON myappdb.salida
FOR DELETE
TO authenticated
USING (
  app_private.can_access_row(NULL::text, idsucursal::text, NULL::text, idusuario)
  OR (
    app_private.current_usuario_tenant_ok(NULL::text, idsucursal::text)
    AND app_private.has_permission(
      'almacen.salidafactura',
      'eliminar',
      NULL::text,
      idsucursal::text
    )
  )
);

DROP POLICY IF EXISTS factura_update_permiso ON myappdb.factura;

CREATE POLICY factura_update_permiso
ON myappdb.factura
FOR UPDATE
TO authenticated
USING (
  app_private.current_usuario_tenant_ok(fa_codempr::text, fa_codsucu::text)
  AND app_private.has_any_permission(
    '[
      {"recurso":"facturacion.factura","accion":"editar"},
      {"recurso":"facturacion.factura","accion":"enviar_dgii"},
      {"recurso":"caja.cobrofact","accion":"cobrar"},
      {"recurso":"caja.cobrofact","accion":"enviar_dgii"},
      {"recurso":"almacen.salidafactura","accion":"crear"},
      {"recurso":"almacen.salidafactura","accion":"editar"}
    ]'::jsonb,
    fa_codempr::text,
    fa_codsucu::text
  )
)
WITH CHECK (
  app_private.current_usuario_tenant_ok(fa_codempr::text, fa_codsucu::text)
  AND app_private.has_any_permission(
    '[
      {"recurso":"facturacion.factura","accion":"editar"},
      {"recurso":"facturacion.factura","accion":"enviar_dgii"},
      {"recurso":"caja.cobrofact","accion":"cobrar"},
      {"recurso":"caja.cobrofact","accion":"enviar_dgii"},
      {"recurso":"almacen.salidafactura","accion":"crear"},
      {"recurso":"almacen.salidafactura","accion":"editar"}
    ]'::jsonb,
    fa_codempr::text,
    fa_codsucu::text
  )
);
