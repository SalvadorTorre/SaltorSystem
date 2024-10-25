import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Fpago } from './fpago';

const routes: Routes = [
  {path:"",
    component:Fpago

  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaFpago { }
