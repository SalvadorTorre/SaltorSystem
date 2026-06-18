-- Permite que los usuarios de despacho consulten factura y detfactura.
-- Corrige el caso donde la app movil dice "Factura no encontrada" aunque
-- exista en myappdb.factura, porque RLS oculta la fila al rol de despacho.

BEGIN;

INSERT INTO myappdb.permiso_recurso_catalogo
(modulo_key, modulo_nombre, recurso_key, pantalla_nombre, ruta, activo, requiere_tenant, orden)
VALUES
  ('despacho','Despacho','despacho.main','Despacho','/private/despacho',true,true,40)
ON CONFLICT (recurso_key) DO UPDATE
SET modulo_key = EXCLUDED.modulo_key,
    modulo_nombre = EXCLUDED.modulo_nombre,
    pantalla_nombre = EXCLUDED.pantalla_nombre,
    ruta = EXCLUDED.ruta,
    activo = EXCLUDED.activo,
    requiere_tenant = EXCLUDED.requiere_tenant,
    orden = EXCLUDED.orden;

INSERT INTO myappdb.permiso_recurso_accion_catalogo(recurso_key, accion_key, activo)
VALUES
  ('despacho.main', 'ver', true),
  ('despacho.main', 'imprimir', true)
ON CONFLICT (recurso_key, accion_key) DO UPDATE
SET activo = EXCLUDED.activo;

WITH usuarios_despacho AS (
  SELECT DISTINCT
    u.codusuario,
    NULLIF(btrim(u.cod_empre), '') AS cod_empre,
    NULLIF(u.sucursalid, 0) AS sucursalid
  FROM myappdb.usuario u
  LEFT JOIN myappdb.tipousuario tu
    ON tu.id = u.idtipousuario
  LEFT JOIN myappdb.dtipousuario dt
    ON dt.idtipousuario = u.idtipousuario
  LEFT JOIN myappdb.modulo m
    ON m.idmodulo = dt.idmodulo
  WHERE
    lower(coalesce(tu.descripcion, '')) LIKE '%desp%'
    OR lower(coalesce(tu.descripcion, '')) LIKE '%forja%'
    OR lower(coalesce(m.descmodulo, '')) LIKE '%desp%'
    OR lower(coalesce(m.descmodulo, '')) LIKE '%forja%'
),
acciones AS (
  SELECT 'ver'::varchar(50) AS accion_key
  UNION ALL
  SELECT 'imprimir'::varchar(50)
)
INSERT INTO myappdb.usuario_permiso_accion (
  codusuario,
  recurso_key,
  accion_key,
  permitido,
  cod_empre,
  sucursalid,
  activo
)
SELECT
  ud.codusuario,
  'despacho.main',
  a.accion_key,
  true,
  ud.cod_empre,
  ud.sucursalid,
  true
FROM usuarios_despacho ud
CROSS JOIN acciones a
WHERE NOT EXISTS (
  SELECT 1
  FROM myappdb.usuario_permiso_accion upa
  WHERE upa.codusuario = ud.codusuario
    AND upa.recurso_key = 'despacho.main'
    AND upa.accion_key = a.accion_key
    AND coalesce(upa.cod_empre, '') = coalesce(ud.cod_empre, '')
    AND coalesce(upa.sucursalid, 0) = coalesce(ud.sucursalid, 0)
);

DROP POLICY IF EXISTS factura_select_permiso ON myappdb.factura;

CREATE POLICY factura_select_permiso
ON myappdb.factura
FOR SELECT TO authenticated
USING (
  app_private.current_usuario_tenant_ok(fa_codempr::text, fa_codsucu::text)
  AND (
    app_private.has_any_permission(
      '[
        {"recurso":"facturacion.factura","accion":"ver"},
        {"recurso":"caja.cobrofact","accion":"ver"},
        {"recurso":"contabilidad.facturas_pendientes","accion":"ver"},
        {"recurso":"despacho.main","accion":"ver"},
        {"recurso":"despacho.main","accion":"imprimir"}
      ]'::jsonb,
      fa_codempr::text,
      fa_codsucu::text
    )
    OR app_private.current_role_label() LIKE '%desp%'
    OR app_private.current_role_label() LIKE '%forja%'
  )
);

DROP POLICY IF EXISTS detfactura_select_permiso ON myappdb.detfactura;

CREATE POLICY detfactura_select_permiso
ON myappdb.detfactura
FOR SELECT TO authenticated
USING (
  app_private.current_usuario_tenant_ok(df_codepr::text, df_codsucu::text)
  AND (
    app_private.has_any_permission(
      '[
        {"recurso":"facturacion.factura","accion":"ver"},
        {"recurso":"caja.cobrofact","accion":"ver"},
        {"recurso":"almacen.controlfact","accion":"ver"},
        {"recurso":"despacho.main","accion":"ver"},
        {"recurso":"despacho.main","accion":"imprimir"}
      ]'::jsonb,
      df_codepr::text,
      df_codsucu::text
    )
    OR app_private.current_role_label() LIKE '%desp%'
    OR app_private.current_role_label() LIKE '%forja%'
  )
);

NOTIFY pgrst, 'reload schema';

COMMIT;
