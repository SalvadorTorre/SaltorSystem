import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Despacho, } from './despacho';

const routes: Routes = [
  {
    path: "",
    component: Despacho

  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaDespacho { }
