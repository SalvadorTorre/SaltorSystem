import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConsultaVentas } from './consulta-ventas';

const routes: Routes = [
  {
    path: '',
    component: ConsultaVentas
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ConsultaVentasRoutingModule {}
