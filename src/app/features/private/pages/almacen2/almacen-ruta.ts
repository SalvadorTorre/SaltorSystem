import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Almacen } from './almacen';

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
        loadChildren: () =>
          import('./pages/controlfact-page/controlfact-modulo').then(
            (m) => m.ModuloControlFact
          ),
      },
      {
        path: 'entradamerc',
        loadChildren: () =>
          import('./pages/entradamerc-page/entradamerc-modulo').then(
            (m) => m.ModuloEntradaMerc
          ),
      },

      {
        path: 'ventainterna',
        loadChildren: () =>
          import('./pages/ventainterna/ventainterna-modulo').then(
            (m) => m.ModuloVentainterna
          ),
      },

      {
        path: 'pendiente',
        loadChildren: () =>
          import('./pages/pendiente/pendiente-modulo').then(
            (m) => m.ModuloPendiente
          ),
      },

      {
        path: 'salidafactura',
        loadChildren: () =>
          import('./pages/salidafactura/salidafactura-modulo').then(
            (m) => m.ModuloSalidafactura
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
