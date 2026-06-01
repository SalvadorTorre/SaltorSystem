import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Contabilidad } from './contabilidad';
import { FacturasPendientesComponent } from './pages/facturas-pendientes/facturas-pendientes';
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
