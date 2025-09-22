import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MovimientoProducto } from './movproducto';

const routes: Routes = [
  {
    path: '',
    component: MovimientoProducto
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MovimientoProductoRoutingModule {}
