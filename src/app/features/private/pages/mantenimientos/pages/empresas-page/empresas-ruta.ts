import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Empresas } from './empresas';

const routes: Routes = [
  {path:"",
       component:Empresas
  }
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaEmpresas { }

