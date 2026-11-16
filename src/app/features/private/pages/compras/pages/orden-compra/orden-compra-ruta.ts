import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OrdenCompraComponent } from './orden-compra';

const routes: Routes = [{ path: '', component: OrdenCompraComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RutaOrdenCompra {}
