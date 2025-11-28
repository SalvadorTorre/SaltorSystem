import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Rnc } from './rnc';
const routes: Routes = [
  {path:"",
       component: Rnc
  }
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaRnc { }
