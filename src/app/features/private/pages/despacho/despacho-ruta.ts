import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DespachoComponent, } from './despacho';
import { permissionGuard } from 'src/app/core/guards/permission/permission.guard';

const routes: Routes = [
  {
    path: "",
    component: DespachoComponent,
    canActivate: [permissionGuard],
    data: { accessPath: '/private/despacho' }

  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaDespacho { }
