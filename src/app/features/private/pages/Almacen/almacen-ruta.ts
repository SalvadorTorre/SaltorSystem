import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Almacen, } from './almacen';

const routes: Routes = [
  {path:"",
    component:Almacen

  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaAlmacen { }
