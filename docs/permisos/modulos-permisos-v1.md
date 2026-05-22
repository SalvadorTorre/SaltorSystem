# Matriz de permisos v1 (SaltorSystem)

Base para implementar permisos por modulo + accion + alcance tenant (empresa/sucursal).

## 1) Acciones estandar

- `ver`: abrir modulo/pantalla y consultar datos.
- `crear`: crear nuevos registros.
- `editar`: modificar registros.
- `eliminar`: borrar/anular registros segun la regla del modulo.
- `imprimir`: generar impresion/PDF.
- `exportar`: exportar (excel/csv/pdf).
- `aprobar`: aprobar procesos (cuando aplique).
- `anular`: anular documentos.
- `enviar_dgii`: enviar/reenviar e-CF a DGII.
- `cobrar`: registrar cobro/pago en caja.
- `cerrar_caja`: ejecutar cierre/cuadre de caja.
- `configurar`: cambiar parametros sensibles del sistema.

## 2) Alcances tenant

- `global`: ve todas las empresas/sucursales (ROOT).
- `empresa`: solo una empresa (RNC).
- `sucursal`: solo una sucursal de una empresa.
- `temporal`: asignacion con fecha inicio/fin para mover usuario de una sucursal/empresa a otra sin perder historial.

## 3) Modulos y permisos por pantalla

| Modulo | Pantalla/Feature | Key tecnico | Acciones recomendadas |
|---|---|---|---|
| Inicio | Dashboard | `home.dashboard` | `ver`, `exportar` |
| Facturacion | Facturacion | `facturacion.factura` | `ver`, `crear`, `editar`, `imprimir`, `anular`, `enviar_dgii`, `exportar` |
| Cotizacion | Cotizaciones | `cotizacion.gestion` | `ver`, `crear`, `editar`, `imprimir`, `anular`, `exportar` |
| Despacho | Despacho | `despacho.main` | `ver`, `crear`, `editar`, `imprimir`, `aprobar`, `exportar` |
| Contabilidad | Facturas pendientes | `contabilidad.facturas_pendientes` | `ver`, `editar`, `imprimir`, `exportar` |
| Reportes | Movimiento producto | `reporte.mov_producto` | `ver`, `exportar`, `imprimir` |
| Caja | Cobro factura | `caja.cobrofact` | `ver`, `cobrar`, `editar`, `imprimir`, `anular` |
| Caja | Control salida | `caja.controlsalida` | `ver`, `editar`, `imprimir`, `exportar` |
| Caja | Cuadre caja | `caja.cuadrecaja` | `ver`, `cerrar_caja`, `imprimir`, `exportar` |
| Caja | Recibo ingreso | `caja.reciboingreso` | `ver`, `crear`, `editar`, `imprimir`, `anular` |
| Almacen | Control factura | `almacen.controlfact` | `ver`, `crear`, `editar`, `imprimir`, `exportar` |
| Almacen | Entrada mercancia | `almacen.entradamerc` | `ver`, `crear`, `editar`, `imprimir`, `aprobar` |
| Almacen | Venta interna | `almacen.ventainterna` | `ver`, `crear`, `editar`, `imprimir`, `anular` |
| Almacen | Pendiente entrega | `almacen.pendiente` | `ver`, `editar`, `imprimir` |
| Almacen | Salida factura | `almacen.salidafactura` | `ver`, `crear`, `editar`, `imprimir`, `aprobar` |
| Almacen | Devoluciones | `almacen.devoluciones` | `ver`, `crear`, `editar`, `imprimir`, `aprobar` |
| Mantenimiento | Inventario/Productos | `mnt.inventario` | `ver`, `crear`, `editar`, `imprimir`, `exportar` |
| Mantenimiento | Clientes | `mnt.cliente` | `ver`, `crear`, `editar`, `imprimir`, `exportar` |
| Mantenimiento | Suplidores | `mnt.suplidor` | `ver`, `crear`, `editar`, `imprimir`, `exportar` |
| Mantenimiento | Zonas | `mnt.zona` | `ver`, `crear`, `editar`, `eliminar` |
| Mantenimiento | Sectores | `mnt.sector` | `ver`, `crear`, `editar`, `eliminar` |
| Mantenimiento | Usuarios | `mnt.usuario` | `ver`, `crear`, `editar`, `eliminar`, `configurar` |
| Mantenimiento | Choferes | `mnt.choferes` | `ver`, `crear`, `editar`, `eliminar` |
| Mantenimiento | Despachadores | `mnt.despachadores` | `ver`, `crear`, `editar`, `eliminar` |
| Mantenimiento | Empresas | `mnt.empresas` | `ver`, `crear`, `editar`, `configurar` |
| Mantenimiento | Grupo mercancias | `mnt.grupo_mercancias` | `ver`, `crear`, `editar`, `eliminar` |
| Mantenimiento | ENCF | `mnt.encf` | `ver`, `crear`, `editar`, `configurar` |
| Mantenimiento | Modulos | `mnt.modulo` | `ver`, `crear`, `editar`, `eliminar`, `configurar` |
| Mantenimiento | Permisos | `mnt.permiso` | `ver`, `crear`, `editar`, `eliminar`, `configurar` |
| Mantenimiento | Tipos de usuario | `mnt.tipousuario` | `ver`, `crear`, `editar`, `eliminar`, `configurar` |
| Mantenimiento | Cont factura | `mnt.contfactura` | `ver`, `crear`, `editar`, `configurar` |
| Mantenimiento | Forma entrega | `mnt.fentrega` | `ver`, `crear`, `editar`, `eliminar` |
| Mantenimiento | RNC | `mnt.rnc` | `ver`, `crear`, `editar`, `eliminar`, `configurar` |
| Mantenimiento | Config global DGII | `mnt.config_global` | `ver`, `editar`, `configurar` |

## 4) Pantallas en sidebar sin ruta activa (dejar previstas)

| Modulo | Key tecnico | Acciones recomendadas |
|---|---|---|
| Mantenimiento - Forma pago | `mnt.fpago` | `ver`, `crear`, `editar`, `eliminar` |
| Caja - Caja envio | `caja.cajaenvio` | `ver`, `crear`, `editar`, `imprimir` |
| Almacen - Conduce | `almacen.conduce` | `ver`, `crear`, `editar`, `imprimir`, `aprobar` |
| Almacen - Solicitud prestamo | `almacen.solicitud_prestamo` | `ver`, `crear`, `editar`, `aprobar` |
| Almacen - Control gasoil | `almacen.control_gasoil` | `ver`, `crear`, `editar`, `imprimir` |
| Contabilidad - Nota credito | `contabilidad.nota_credito` | `ver`, `crear`, `editar`, `imprimir`, `anular` |
| Contabilidad - Cuentas por cobrar | `contabilidad.cxc` | `ver`, `editar`, `exportar` |
| Contabilidad - Reporte 606 | `contabilidad.reporte_606` | `ver`, `exportar`, `imprimir` |
| Reporte - Entrada producto | `reporte.entrada_producto` | `ver`, `exportar`, `imprimir` |
| Reporte - Salida producto | `reporte.salida_producto` | `ver`, `exportar`, `imprimir` |
| Reporte - Consulta producto | `reporte.consulta_producto` | `ver`, `exportar`, `imprimir` |

## 5) Plantilla sugerida por tipo de usuario (inicial)

- `ROOT`: todo en `global`.
- `ADMIN`: `ver` global + acciones operativas por empresa/sucursal, sin `configurar` global sensible.
- `COMPUTOS`: `ver/crear/editar` en modulos operativos y mantenimientos tecnicos; limitado en acciones financieras criticas (`anular`, `cerrar_caja`) segun politica.
- `VENDEDOR`: permisos operativos de venta en su tenant activo (`facturacion`, `cotizacion`, consulta de clientes/productos, dashboard).

## 6) Reglas funcionales para mover usuarios entre empresas/sucursales

- Un usuario tiene `tenant por defecto` (empresa + sucursal principal).
- Puede tener `asignaciones temporales` a otra empresa/sucursal con fecha inicio/fin.
- El sistema siempre usa el `tenant activo` para consultar y guardar.
- Si usuario es `ROOT`, puede cambiar tenant activo manualmente desde UI.

