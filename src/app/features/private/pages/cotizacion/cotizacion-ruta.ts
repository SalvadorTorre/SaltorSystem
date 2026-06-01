import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Cotizacion } from './cotizacion';
import { permissionGuard } from 'src/app/core/guards/permission/permission.guard';
const routes: Routes = [
  {
    path:"",
    component:Cotizacion,
    canActivate: [permissionGuard],
    data: { accessPath: '/private/cotizacion' }
  }
  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaCotizacion { }
