import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Almacen, } from './almacen';

// const routes: Routes = [
//   {path:"",
//     component:Almacen

//   }
// ];

const routes: Routes = [
  {
    path:"",
    redirectTo:"entradamerc",
    pathMatch:"full"
  },

    {path:"",
      component:Almacen,
      children:[


        //{
        //   path:"Control Factura",
        //   loadChildren: () => import('./pages/inventario-page/inventario-modulo').then(m => m.ModuloInventario)
        // },
        {
          path:"entradamerc",
          loadChildren: () => import('./pages/entradamerc-page/entradamerc-modulo').then(m => m.ModuloEntradamerc)
        },

        {
          path:"ventainterna",
          loadChildren: () => import('./pages/ventainterna/ventainterna-modulo').then(m => m.ModuloVentainterna)
        },

      //   {
      //     path:"Fact. Pendiente Entrega",
      //     loadChildren: () => import('./pages/zona-page/zona-modulo').then(m => m.ModuloZona)
      //   },

      //   {
      //     path:"Control Salida Factura",
      //     loadChildren: () => import('./pages/sector-page/sector-modulo').then(m => m.ModuloSector)
      //   },
      //   {
      //     path:"Conduce",
      //     loadChildren: () => import('./pages/usuario-page/usuario-modulo').then(m => m.ModuloUsuario)
      //   },
      // {
      //     path:"Solicitud Prestamo",
      //     loadChildren: () => import('./pages/choferes-page/choferes-modulo').then(m => m.ModuloChoferes)
      //   },

      ]
    }
  ];




@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaAlmacen { }
