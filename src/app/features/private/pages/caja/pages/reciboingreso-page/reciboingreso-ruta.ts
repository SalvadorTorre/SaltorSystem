
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReciboIngresoComponent } from './reciboingreso';

const routes: Routes = [
  {
    path: '',
    component: ReciboIngresoComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaReciboIngreso { }
