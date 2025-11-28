import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Cotizacion } from './cotizacion';
const routes: Routes = [
  {path:"",
    component:Cotizacion

  }
  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaCotizacion { }
