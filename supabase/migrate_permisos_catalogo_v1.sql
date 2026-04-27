-- Catalogo de permisos v1 (myappdb)
-- Objetivo: normalizar permisos por modulo/pantalla/accion y soporte tenant por empresa/sucursal.

BEGIN;

CREATE TABLE IF NOT EXISTS myappdb.permiso_accion_catalogo (
  accion_key varchar(30) PRIMARY KEY,
  descripcion varchar(120) NOT NULL,
  orden int4 NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS myappdb.permiso_recurso_catalogo (
  id bigserial PRIMARY KEY,
  modulo_key varchar(40) NOT NULL,
  modulo_nombre varchar(60) NOT NULL,
  recurso_key varchar(80) NOT NULL UNIQUE,
  pantalla_nombre varchar(120) NOT NULL,
  ruta varchar(180),
  activo boolean NOT NULL DEFAULT true,
  requiere_tenant boolean NOT NULL DEFAULT true,
  orden int4 NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS myappdb.permiso_recurso_accion_catalogo (
  id bigserial PRIMARY KEY,
  recurso_key varchar(80) NOT NULL REFERENCES myappdb.permiso_recurso_catalogo(recurso_key) ON DELETE CASCADE,
  accion_key varchar(30) NOT NULL REFERENCES myappdb.permiso_accion_catalogo(accion_key) ON DELETE CASCADE,
  activo boolean NOT NULL DEFAULT true,
  UNIQUE (recurso_key, accion_key)
);

CREATE TABLE IF NOT EXISTS myappdb.usuario_tenant_asignacion (
  id bigserial PRIMARY KEY,
  codusuario int4 NOT NULL REFERENCES myappdb.usuario(codusuario) ON DELETE CASCADE,
  cod_empre varchar(30) NOT NULL REFERENCES myappdb.empresas(cod_empre),
  sucursalid int4 REFERENCES myappdb.sucursales(sucursalid),
  es_principal boolean NOT NULL DEFAULT false,
  es_temporal boolean NOT NULL DEFAULT false,
  fecha_inicio timestamptz NOT NULL DEFAULT now(),
  fecha_fin timestamptz,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usuario_tenant_asig_user ON myappdb.usuario_tenant_asignacion(codusuario);
CREATE INDEX IF NOT EXISTS idx_usuario_tenant_asig_tenant ON myappdb.usuario_tenant_asignacion(cod_empre, sucursalid);
CREATE INDEX IF NOT EXISTS idx_usuario_tenant_asig_activo ON myappdb.usuario_tenant_asignacion(activo, fecha_inicio, fecha_fin);

-- Una sola asignacion principal activa por usuario.
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuario_tenant_asig_principal
ON myappdb.usuario_tenant_asignacion(codusuario)
WHERE (es_principal = true AND activo = true);

INSERT INTO myappdb.permiso_accion_catalogo (accion_key, descripcion, orden, activo) VALUES
  ('ver', 'Ver/consultar', 10, true),
  ('crear', 'Crear registros', 20, true),
  ('editar', 'Editar registros', 30, true),
  ('eliminar', 'Eliminar registros', 40, true),
  ('imprimir', 'Imprimir comprobantes/reportes', 50, true),
  ('exportar', 'Exportar datos', 60, true),
  ('aprobar', 'Aprobar procesos', 70, true),
  ('anular', 'Anular documentos', 80, true),
  ('enviar_dgii', 'Enviar a DGII', 90, true),
  ('cobrar', 'Cobrar facturas/recibos', 100, true),
  ('cerrar_caja', 'Ejecutar cierre de caja', 110, true),
  ('configurar', 'Cambiar configuraciones sensibles', 120, true)
ON CONFLICT (accion_key) DO UPDATE
SET descripcion = EXCLUDED.descripcion,
    orden = EXCLUDED.orden,
    activo = EXCLUDED.activo;

INSERT INTO myappdb.permiso_recurso_catalogo
(modulo_key, modulo_nombre, recurso_key, pantalla_nombre, ruta, activo, requiere_tenant, orden)
VALUES
  ('home','Inicio','home.dashboard','Dashboard','/private/home',true,true,10),

  ('facturacion','Facturacion','facturacion.factura','Facturacion','/private/facturacion',true,true,20),
  ('cotizacion','Cotizacion','cotizacion.gestion','Gestion de Cotizaciones','/private/cotizacion',true,true,30),
  ('despacho','Despacho','despacho.main','Despacho','/private/despacho',true,true,40),

  ('contabilidad','Contabilidad','contabilidad.facturas_pendientes','Facturas pendientes','/private/contabilidad/facturas-pendientes',true,true,50),

  ('reporte','Reportes','reporte.mov_producto','Movimiento de productos','/private/reporte/movproducto',true,true,60),

  ('caja','Caja','caja.cobrofact','Cobro factura','/private/caja/CobroFact',true,true,70),
  ('caja','Caja','caja.controlsalida','Control salida','/private/caja/ControlSalida',true,true,71),
  ('caja','Caja','caja.cuadrecaja','Cuadre de caja','/private/caja/cuadrecaja',true,true,72),
  ('caja','Caja','caja.reciboingreso','Recibo ingreso','/private/caja/reciboingreso',true,true,73),

  ('almacen','Almacen','almacen.controlfact','Control factura','/private/almacen/controlfact',true,true,80),
  ('almacen','Almacen','almacen.entradamerc','Entrada mercancia','/private/almacen/entradamerc',true,true,81),
  ('almacen','Almacen','almacen.ventainterna','Venta interna','/private/almacen/ventainterna',true,true,82),
  ('almacen','Almacen','almacen.pendiente','Pendiente entrega','/private/almacen/pendiente',true,true,83),
  ('almacen','Almacen','almacen.salidafactura','Salida factura','/private/almacen/salidafactura',true,true,84),
  ('almacen','Almacen','almacen.devoluciones','Devoluciones','/private/almacen/devoluciones',true,true,85),

  ('mantenimientos','Mantenimientos','mnt.inventario','Inventario/Productos','/private/mantenimientos/inventario',true,true,100),
  ('mantenimientos','Mantenimientos','mnt.cliente','Clientes','/private/mantenimientos/cliente',true,true,101),
  ('mantenimientos','Mantenimientos','mnt.suplidor','Suplidores','/private/mantenimientos/suplidor',true,true,102),
  ('mantenimientos','Mantenimientos','mnt.zona','Zonas','/private/mantenimientos/zona',true,true,103),
  ('mantenimientos','Mantenimientos','mnt.sector','Sectores','/private/mantenimientos/sector',true,true,104),
  ('mantenimientos','Mantenimientos','mnt.usuario','Usuarios','/private/mantenimientos/usuario',true,true,105),
  ('mantenimientos','Mantenimientos','mnt.choferes','Choferes','/private/mantenimientos/choferes',true,true,106),
  ('mantenimientos','Mantenimientos','mnt.despachadores','Despachadores','/private/mantenimientos/despachadores',true,true,107),
  ('mantenimientos','Mantenimientos','mnt.empresas','Empresas','/private/mantenimientos/Empresas',true,false,108),
  ('mantenimientos','Mantenimientos','mnt.grupo_mercancias','Grupo mercancias','/private/mantenimientos/grupo-mercancias',true,true,109),
  ('mantenimientos','Mantenimientos','mnt.encf','ENCF','/private/mantenimientos/encf',true,true,110),
  ('mantenimientos','Mantenimientos','mnt.modulo','Modulos','/private/mantenimientos/modulo',true,false,111),
  ('mantenimientos','Mantenimientos','mnt.permiso','Permisos','/private/mantenimientos/permiso',true,false,112),
  ('mantenimientos','Mantenimientos','mnt.tipousuario','Tipos de usuario','/private/mantenimientos/tipousuario',true,false,113),
  ('mantenimientos','Mantenimientos','mnt.contfactura','Contadores factura','/private/mantenimientos/contfactura',true,true,114),
  ('mantenimientos','Mantenimientos','mnt.fentrega','Forma entrega','/private/mantenimientos/fentrega',true,true,115),
  ('mantenimientos','Mantenimientos','mnt.rnc','RNC','/private/mantenimientos/rnc',true,false,116),
  ('mantenimientos','Mantenimientos','mnt.config_global','Configuracion global DGII','/private/mantenimientos/configuracion-global',true,false,117),

  -- Catalogadas para futuro (menu visible sin ruta activa)
  ('mantenimientos','Mantenimientos','mnt.fpago','Forma pago',NULL,true,true,130),
  ('caja','Caja','caja.cajaenvio','Caja envio',NULL,true,true,131),
  ('almacen','Almacen','almacen.conduce','Conduce',NULL,true,true,132),
  ('almacen','Almacen','almacen.solicitud_prestamo','Solicitud prestamo',NULL,true,true,133),
  ('almacen','Almacen','almacen.control_gasoil','Control gasoil',NULL,true,true,134),
  ('contabilidad','Contabilidad','contabilidad.nota_credito','Nota de credito',NULL,true,true,135),
  ('contabilidad','Contabilidad','contabilidad.cxc','Cuentas por cobrar',NULL,true,true,136),
  ('contabilidad','Contabilidad','contabilidad.reporte_606','Reporte 606',NULL,true,true,137),
  ('reporte','Reportes','reporte.entrada_producto','Entrada producto',NULL,true,true,138),
  ('reporte','Reportes','reporte.salida_producto','Salida producto',NULL,true,true,139),
  ('reporte','Reportes','reporte.consulta_producto','Consulta producto',NULL,true,true,140)
ON CONFLICT (recurso_key) DO UPDATE
SET modulo_key = EXCLUDED.modulo_key,
    modulo_nombre = EXCLUDED.modulo_nombre,
    pantalla_nombre = EXCLUDED.pantalla_nombre,
    ruta = EXCLUDED.ruta,
    activo = EXCLUDED.activo,
    requiere_tenant = EXCLUDED.requiere_tenant,
    orden = EXCLUDED.orden;

-- Accion base 'ver' para todos los recursos
INSERT INTO myappdb.permiso_recurso_accion_catalogo(recurso_key, accion_key, activo)
SELECT recurso_key, 'ver', true
FROM myappdb.permiso_recurso_catalogo
ON CONFLICT (recurso_key, accion_key) DO UPDATE SET activo = EXCLUDED.activo;

-- Crear
INSERT INTO myappdb.permiso_recurso_accion_catalogo(recurso_key, accion_key, activo)
SELECT recurso_key, 'crear', true
FROM myappdb.permiso_recurso_catalogo
WHERE recurso_key IN (
  'facturacion.factura','cotizacion.gestion','despacho.main',
  'caja.reciboingreso',
  'almacen.controlfact','almacen.entradamerc','almacen.ventainterna','almacen.salidafactura','almacen.devoluciones',
  'mnt.inventario','mnt.cliente','mnt.suplidor','mnt.zona','mnt.sector','mnt.usuario','mnt.choferes','mnt.despachadores',
  'mnt.empresas','mnt.grupo_mercancias','mnt.encf','mnt.modulo','mnt.permiso','mnt.tipousuario','mnt.contfactura','mnt.fentrega','mnt.rnc',
  'mnt.fpago','caja.cajaenvio','almacen.conduce','almacen.solicitud_prestamo','almacen.control_gasoil','contabilidad.nota_credito'
)
ON CONFLICT (recurso_key, accion_key) DO UPDATE SET activo = EXCLUDED.activo;

-- Editar
INSERT INTO myappdb.permiso_recurso_accion_catalogo(recurso_key, accion_key, activo)
SELECT recurso_key, 'editar', true
FROM myappdb.permiso_recurso_catalogo
WHERE recurso_key NOT IN ('home.dashboard','reporte.mov_producto','reporte.entrada_producto','reporte.salida_producto','reporte.consulta_producto')
ON CONFLICT (recurso_key, accion_key) DO UPDATE SET activo = EXCLUDED.activo;

-- Eliminar
INSERT INTO myappdb.permiso_recurso_accion_catalogo(recurso_key, accion_key, activo)
SELECT recurso_key, 'eliminar', true
FROM myappdb.permiso_recurso_catalogo
WHERE recurso_key IN (
  'mnt.zona','mnt.sector','mnt.usuario','mnt.choferes','mnt.despachadores','mnt.grupo_mercancias',
  'mnt.modulo','mnt.permiso','mnt.tipousuario','mnt.fentrega','mnt.rnc','mnt.fpago'
)
ON CONFLICT (recurso_key, accion_key) DO UPDATE SET activo = EXCLUDED.activo;

-- Imprimir
INSERT INTO myappdb.permiso_recurso_accion_catalogo(recurso_key, accion_key, activo)
SELECT recurso_key, 'imprimir', true
FROM myappdb.permiso_recurso_catalogo
WHERE recurso_key IN (
  'facturacion.factura','cotizacion.gestion','despacho.main',
  'contabilidad.facturas_pendientes','reporte.mov_producto','reporte.entrada_producto','reporte.salida_producto','reporte.consulta_producto',
  'caja.cobrofact','caja.controlsalida','caja.cuadrecaja','caja.reciboingreso','caja.cajaenvio',
  'almacen.controlfact','almacen.entradamerc','almacen.ventainterna','almacen.pendiente','almacen.salidafactura','almacen.devoluciones','almacen.conduce','almacen.control_gasoil',
  'mnt.inventario','mnt.cliente','mnt.suplidor'
)
ON CONFLICT (recurso_key, accion_key) DO UPDATE SET activo = EXCLUDED.activo;

-- Exportar
INSERT INTO myappdb.permiso_recurso_accion_catalogo(recurso_key, accion_key, activo)
SELECT recurso_key, 'exportar', true
FROM myappdb.permiso_recurso_catalogo
WHERE recurso_key IN (
  'home.dashboard','facturacion.factura','cotizacion.gestion','despacho.main',
  'contabilidad.facturas_pendientes','contabilidad.cxc','contabilidad.reporte_606',
  'reporte.mov_producto','reporte.entrada_producto','reporte.salida_producto','reporte.consulta_producto',
  'caja.controlsalida','caja.cuadrecaja',
  'almacen.controlfact',
  'mnt.inventario','mnt.cliente','mnt.suplidor'
)
ON CONFLICT (recurso_key, accion_key) DO UPDATE SET activo = EXCLUDED.activo;

-- Aprobar
INSERT INTO myappdb.permiso_recurso_accion_catalogo(recurso_key, accion_key, activo)
SELECT recurso_key, 'aprobar', true
FROM myappdb.permiso_recurso_catalogo
WHERE recurso_key IN ('despacho.main','almacen.entradamerc','almacen.salidafactura','almacen.devoluciones','almacen.conduce','almacen.solicitud_prestamo')
ON CONFLICT (recurso_key, accion_key) DO UPDATE SET activo = EXCLUDED.activo;

-- Anular
INSERT INTO myappdb.permiso_recurso_accion_catalogo(recurso_key, accion_key, activo)
SELECT recurso_key, 'anular', true
FROM myappdb.permiso_recurso_catalogo
WHERE recurso_key IN ('facturacion.factura','cotizacion.gestion','caja.cobrofact','caja.reciboingreso','almacen.ventainterna','contabilidad.nota_credito')
ON CONFLICT (recurso_key, accion_key) DO UPDATE SET activo = EXCLUDED.activo;

-- Enviar DGII
INSERT INTO myappdb.permiso_recurso_accion_catalogo(recurso_key, accion_key, activo)
SELECT recurso_key, 'enviar_dgii', true
FROM myappdb.permiso_recurso_catalogo
WHERE recurso_key IN ('facturacion.factura','mnt.encf','mnt.config_global')
ON CONFLICT (recurso_key, accion_key) DO UPDATE SET activo = EXCLUDED.activo;

-- Cobrar
INSERT INTO myappdb.permiso_recurso_accion_catalogo(recurso_key, accion_key, activo)
SELECT recurso_key, 'cobrar', true
FROM myappdb.permiso_recurso_catalogo
WHERE recurso_key IN ('caja.cobrofact','caja.reciboingreso')
ON CONFLICT (recurso_key, accion_key) DO UPDATE SET activo = EXCLUDED.activo;

-- Cerrar caja
INSERT INTO myappdb.permiso_recurso_accion_catalogo(recurso_key, accion_key, activo)
SELECT recurso_key, 'cerrar_caja', true
FROM myappdb.permiso_recurso_catalogo
WHERE recurso_key IN ('caja.cuadrecaja')
ON CONFLICT (recurso_key, accion_key) DO UPDATE SET activo = EXCLUDED.activo;

-- Configurar
INSERT INTO myappdb.permiso_recurso_accion_catalogo(recurso_key, accion_key, activo)
SELECT recurso_key, 'configurar', true
FROM myappdb.permiso_recurso_catalogo
WHERE recurso_key IN (
  'mnt.usuario','mnt.empresas','mnt.encf','mnt.modulo','mnt.permiso','mnt.tipousuario','mnt.contfactura','mnt.rnc','mnt.config_global'
)
ON CONFLICT (recurso_key, accion_key) DO UPDATE SET activo = EXCLUDED.activo;

COMMIT;
