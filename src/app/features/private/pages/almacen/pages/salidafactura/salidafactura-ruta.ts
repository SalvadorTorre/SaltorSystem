import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RutaSalidafactura } from './salidafactura';
const routes: Routes = [
  {
    path: "",
    component: RutaSalidafactura

  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaSalidafacturaModule { }
