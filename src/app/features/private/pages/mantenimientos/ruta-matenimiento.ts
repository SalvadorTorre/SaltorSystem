
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Mantenimiento, } from './mantenimiento';

const routes: Routes = [
  {
    path:"",
    redirectTo:"inventario",
    pathMatch:"full"
  },
    {path:"",
      component:Mantenimiento,
      children:[
        {
          path:"inventario",
          loadChildren: () => import('./pages/inventario-page/inventario-modulo').then(m => m.ModuloInventario)
        },

        {
          path:"cliente",
          loadChildren: () => import('./pages/cliente-page/cliente-modulo').then(m => m.ModuloCliente)
        },

        {
          path:"suplidor",
          loadChildren: () => import('./pages/suplidor-page/suplidor-modulo').then(m => m.ModuloSuplidor)
        },

        {
          path:"zona",
          loadChildren: () => import('./pages/zona-page/zona-modulo').then(m => m.ModuloZona)
        },

      /*  {
          path:"sector",
          loadChildren: () => import('./pages/sector-page/sector-modulo').then(m => m.ModuloSector)
        },*/
      ]
    }
  ];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaMantenimiento { }


