import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Almacen } from './almacen';
import { permissionGuard } from 'src/app/core/guards/permission/permission.guard';

// const routes: Routes = [
//   {path:"",
//     component:Almacen

//   }
// ];

const routes: Routes = [
  {
    path: '',
    redirectTo: 'entradamerc',
    pathMatch: 'full',
  },

  {
    path: '',
    component: Almacen,
    children: [
      {
        path: 'controlfact',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/almacen/controlfact' },
        loadChildren: () =>
          import('./pages/controlfact-page/controlfact-modulo').then(
            (m) => m.ModuloControlFact
          ),
      },
      {
        path: 'entradamerc',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/almacen/entradamerc' },
        loadChildren: () =>
          import('./pages/entradamerc-page/entradamerc-modulo').then(
            (m) => m.ModuloEntradaMerc
          ),
      },

      {
        path: 'ventainterna',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/almacen/ventainterna' },
        loadChildren: () =>
          import('./pages/ventainterna/ventainterna-modulo').then(
            (m) => m.ModuloVentainterna
          ),
      },

      {
        path: 'pendiente',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/almacen/pendiente' },
        loadChildren: () =>
          import('./pages/pendienteentrega/pendienteentrega-modulo').then(
            (m) => m.ModuloPendienteEntrega
          ),
      },

      {
        path: 'salidafactura',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/almacen/salidafactura' },
        loadChildren: () =>
          import('./pages/salidafactura/salidafactura-modulo').then(
            (m) => m.ModuloSalidafactura
          ),
      },
      {
        path: 'devoluciones',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/almacen/devoluciones' },
        loadChildren: () =>
          import('./pages/devoluciones/devoluciones-modulo').then(
            (m) => m.ModuloDevoluciones
          ),
      },
      {
        path: 'solicitudprestamo',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/almacen/solicitudprestamo' },
        loadChildren: () =>
          import('./pages/solicitudprestamo/solicitudprestamo-modulo').then(
            (m) => m.ModuloSolicitudPrestamo
          ),
      },
      //   {
      //     path:"Conduce",
      //     loadChildren: () => import('./pages/usuario-page/usuario-modulo').then(m => m.ModuloUsuario)
      //   },
      // {
      //     path:"Solicitud Prestamo",
      //     loadChildren: () => import('./pages/choferes-page/choferes-modulo').then(m => m.ModuloChoferes)
      //   },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RutaAlmacen {}
