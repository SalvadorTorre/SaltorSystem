import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GrupoMercancias } from './grupomerc';

const routes: Routes = [
  {path:"",
    component:GrupoMercancias

  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaGrupoMercancias { }
