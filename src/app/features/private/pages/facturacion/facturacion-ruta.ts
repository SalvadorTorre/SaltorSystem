import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Facturacion, } from './facturacion';
import { permissionGuard } from 'src/app/core/guards/permission/permission.guard';

const routes: Routes = [
  {
    path:"",
    component:Facturacion,
    canActivate: [permissionGuard],
    data: { accessPath: '/private/facturacion' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaFacturacion { }
