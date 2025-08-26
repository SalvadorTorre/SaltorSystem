import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DespachoComponent, } from './despacho';

const routes: Routes = [
  {
    path: "",
    component: DespachoComponent

  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaDespacho { }
