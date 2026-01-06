import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CuadreCaja } from './cuadrecaja';

const routes: Routes = [
  {
    path: '',
    component: CuadreCaja
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaCuadreCaja { }
