import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Facturacion, } from './facturacion';

const routes: Routes = [
  {path:"",
    component:Facturacion

  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaFacturacion { }
