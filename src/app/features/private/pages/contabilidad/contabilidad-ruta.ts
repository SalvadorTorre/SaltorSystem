import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Contabilidad } from './contabilidad';
import { FacturasPendientesComponent } from './pages/facturas-pendientes/facturas-pendientes';
import { NotaCreditoComponent } from './pages/nota-credito/nota-credito';
import { Reporte607Component } from './pages/reporte-607/reporte-607';
import { permissionGuard } from 'src/app/core/guards/permission/permission.guard';

const routes: Routes = [
  {
    path: '',
    component: Contabilidad,
    children: [
      {
        path: 'facturas-pendientes',
        component: FacturasPendientesComponent,
        canActivate: [permissionGuard],
        data: { accessPath: '/private/contabilidad/facturas-pendientes' },
      },
      {
        path: 'reporte-607',
        component: Reporte607Component,
        canActivate: [permissionGuard],
        data: { accessPath: '/private/contabilidad/reporte-607' },
      },
      {
        path: 'nota-credito',
        component: NotaCreditoComponent,
        canActivate: [permissionGuard],
        data: { accessPath: '/private/contabilidad/nota-credito' },
      },
      {
        path: '',
        redirectTo: 'facturas-pendientes',
        pathMatch: 'full',
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RutaContabilidad {}
