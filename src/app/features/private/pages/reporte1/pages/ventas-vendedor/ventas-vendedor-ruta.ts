import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { VentasVendedor } from './ventas-vendedor';

const routes: Routes = [
  {
    path: '',
    component: VentasVendedor,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class VentasVendedorRoutingModule {}
