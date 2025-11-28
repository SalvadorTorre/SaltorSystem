import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Zona } from './zona';

const routes: Routes = [
  {path:"",
    component:Zona

  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaZona { }
