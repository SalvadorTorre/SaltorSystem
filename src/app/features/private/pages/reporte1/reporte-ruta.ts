import { RouterModule, Routes } from '@angular/router';
import { Reporte, } from './reporte';
import { NgModule } from '@angular/core';

const routes: Routes = [
  {
    path: '',
    component: Reporte,
    children: [
      {
        path: 'movproducto',
        loadChildren: () =>
          import('./pages/movproducto/movproducto-modulo')
            .then(m => m.MovimientoProductoModule),
      }
    ]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaReporte { }
