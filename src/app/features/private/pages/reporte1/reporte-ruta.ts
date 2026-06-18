import { RouterModule, Routes } from '@angular/router';
import { Reporte, } from './reporte';
import { NgModule } from '@angular/core';
import { permissionGuard } from 'src/app/core/guards/permission/permission.guard';

const routes: Routes = [
  {
    path: '',
    component: Reporte,
    children: [
      {
        path: 'movproducto',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/reporte/movproducto' },
        loadChildren: () =>
          import('./pages/movproducto/movproducto-modulo')
            .then(m => m.MovimientoProductoModule),
      },
      {
        path: 'consulta-ventas',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/reporte/consulta-ventas' },
        loadChildren: () =>
          import('./pages/consulta-ventas/consulta-ventas-modulo')
            .then(m => m.ConsultaVentasModulo),
      }
    ]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaReporte { }
