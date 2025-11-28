import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Cliente } from './cliente';

const routes: Routes = [
  {path:"",
    component:Cliente

  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaCliente { }
