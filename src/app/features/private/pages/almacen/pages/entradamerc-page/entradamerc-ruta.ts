import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Entradamerc } from './entradamerc';
const routes: Routes = [
  {path:"",
    component:Entradamerc

  }
  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaEntradamerc{ }
