import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Mantenimiento } from './mantenimiento';
import { permissionGuard } from 'src/app/core/guards/permission/permission.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'inventario',
    pathMatch: 'full',
  },

  {
    path: '',
    component: Mantenimiento,
    children: [
      {
        path: 'inventario',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/mantenimientos/inventario' },
        loadChildren: () =>
          import('./pages/inventario-page/inventario-modulo').then(
            (m) => m.ModuloInventario
          ),
      },
      {
        path: 'inventario-sucursal',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/mantenimientos/inventario-sucursal' },
        loadChildren: () =>
          import('./pages/inventario-sucursal/inventario-sucursal-modulo').then(
            (m) => m.ModuloInventarioSucursal
          ),
      },
      {
        path: 'precio',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/mantenimientos/precio' },
        loadChildren: () =>
          import('./pages/precio-page/precio-modulo').then(
            (m) => m.ModuloPrecio
          ),
      },

      {
        path: 'cliente',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/mantenimientos/cliente' },
        loadChildren: () =>
          import('./pages/cliente-page/cliente-modulo').then(
            (m) => m.ModuloCliente
          ),
      },
      {
        path: 'sucursales',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/mantenimientos/sucursales' },
        loadChildren: () =>
          import('./pages/sucursales/sucursales-modulo').then(
            (m) => m.ModuloSucursales
          ),
      },

      {
        path: 'suplidor',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/mantenimientos/suplidor' },
        loadChildren: () =>
          import('./pages/suplidor-page/suplidor-modulo').then(
            (m) => m.ModuloSuplidor
          ),
      },

      {
        path: 'zona',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/mantenimientos/zona' },
        loadChildren: () =>
          import('./pages/zona-page/zona-modulo').then((m) => m.ModuloZona),
      },

      {
        path: 'sector',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/mantenimientos/sector' },
        loadChildren: () =>
          import('./pages/sector-page/sector-modulo').then(
            (m) => m.ModuloSector
          ),
      },
      {
        path: 'usuario',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/mantenimientos/usuario' },
        loadChildren: () =>
          import('./pages/usuario-page/usuario-modulo').then(
            (m) => m.ModuloUsuario
          ),
      },

      {
        path: 'choferes',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/mantenimientos/choferes' },
        loadChildren: () =>
          import('./pages/choferes-page/choferes-modulo').then(
            (m) => m.ModuloChoferes
          ),
      },
      {
        path: 'despachadores',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/mantenimientos/despachadores' },
        loadChildren: () =>
          import('./pages/despachadores-page/despachadores-modulo').then(
            (m) => m.ModuloDespachadores
          ),
      },
      {
        path: 'Empresas',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/mantenimientos/Empresas' },
        loadChildren: () =>
          import('./pages/empresas-page/empresas-modulo').then(
            (m) => m.ModuloEmpresas
          ),
      },
      {
        path: 'grupo-mercancias',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/mantenimientos/grupo-mercancias' },
        loadChildren: () =>
          import('./pages/grupormerc/grupomerc-modulo').then(
            (m) => m.ModuloGrupoMercancias
          ),
      },
      {
        path: 'encf',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/mantenimientos/encf' },
        loadChildren: () =>
          import('./pages/encf/encf-modulo').then((m) => m.ModuloEncf),
      },
      {
        path: 'modulo',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/mantenimientos/modulo' },
        loadChildren: () =>
          import('./pages/configuracion/modulo/modulo-modulo').then(
            (m) => m.ModuloModulo
          ),
      },
      {
        path: 'permiso',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/mantenimientos/permiso' },
        loadChildren: () =>
          import('./pages/configuracion/permiso/permiso-modulo').then(
            (m) => m.PermisoModulo
          ),
      },
      {
        path: 'tipousuario',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/mantenimientos/tipousuario' },
        loadChildren: () =>
          import('./pages/configuracion/tipousuario/tipousuario-modulo').then(
            (m) => m.TipousuarioModulo
          ),
      },
      {
        path: 'contfactura',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/mantenimientos/contfactura' },
        loadChildren: () =>
          import('./pages/configuracion/contfactura/contfactura-modulo').then(
            (m) => m.ContFacturaModulo
          ),
      },
      {
        path: 'tasa-itbis',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/mantenimientos/tasa-itbis' },
        loadChildren: () =>
          import('./pages/configuracion/itbis/itbis-modulo').then(
            (m) => m.ItbisModulo
          ),
      },
      {
        path: 'fentrega',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/mantenimientos/fentrega' },
        loadChildren: () =>
          import('./pages/fentrega-page/fentrega-modulo').then(
            (m) => m.ModuloFentrega
          ),
      },
      {
        path: 'fpago',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/mantenimientos/fpago' },
        loadChildren: () =>
          import('./pages/fpago-page/fpago-modulo').then(
            (m) => m.FpagoModulo
          ),
      },
      {
        path: 'cuentas-bancarias',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/mantenimientos/cuentas-bancarias' },
        loadChildren: () =>
          import(
            './pages/configuracion/cuentas-bancarias/cuentas-bancarias-modulo'
          ).then((m) => m.CuentasBancariasModulo),
      },
      {
        path: 'rnc',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/mantenimientos/rnc' },
        loadChildren: () =>
          import('./pages/rnc-page/rnc-modulo').then((m) => m.ModuloRnc),
      },
      {
        path: 'configuracion-global',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/mantenimientos/configuracion-global' },
        loadChildren: () =>
          import(
            './pages/configuracion-global/configuracion-global-modulo'
          ).then((m) => m.ModuloConfiguracionGlobal),
      },
      {
        path: 'cargar-apk',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/mantenimientos/cargar-apk' },
        loadChildren: () =>
          import('./pages/configuracion/cargar-apk/cargar-apk-modulo').then(
            (m) => m.CargarApkModulo,
          ),
      },
      {
        path: 'estado-servidor',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/mantenimientos/estado-servidor' },
        loadChildren: () =>
          import(
            './pages/configuracion/estado-servidor/estado-servidor-modulo'
          ).then((m) => m.EstadoServidorModulo),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RutaMantenimiento {}
