import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InventarioSucursalPageComponent } from './inventario-sucursal';

const routes: Routes = [
  {
    path: '',
    component: InventarioSucursalPageComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RutaInventarioSucursal {}
