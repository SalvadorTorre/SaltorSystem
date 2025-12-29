import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CuadreCajaComponent } from './cuadrecaja';

const routes: Routes = [
  {
    path: '',
    component: CuadreCajaComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaCuadreCaja { }
