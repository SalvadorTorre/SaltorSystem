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





      ]
    }
  ];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaMantenimiento { }
