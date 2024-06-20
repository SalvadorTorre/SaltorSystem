import { ModuloMantenimiento } from './pages/mantenimientos/modulo-mantenimiento';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PrivatePage } from './private.page';

const routes: Routes = [
{
  path:"",
  redirectTo:"mantenimientos",
  pathMatch:"full"
},
  {path:"",
    component:PrivatePage,
    children:[
    {
      path:"mantenimientos",
      loadChildren: () => import('./pages/mantenimientos/modulo-mantenimiento').then(m => m.ModuloMantenimiento)
    }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PrivateRoutingModule { }
