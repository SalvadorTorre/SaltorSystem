import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Caja, } from './caja';

const routes: Routes = [
  {path:"",
    component:Caja

  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaCaja { }
