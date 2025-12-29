import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {Contabilidad, } from './contabilidad';

const routes: Routes = [
  {path:"",
    component:Contabilidad

  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaContabilidad { }
