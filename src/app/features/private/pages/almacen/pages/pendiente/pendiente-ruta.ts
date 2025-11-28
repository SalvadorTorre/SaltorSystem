import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Pendiente, } from './pendiente';

const routes: Routes = [
  {path:"",
    component:Pendiente

  }
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaPendiente { }
