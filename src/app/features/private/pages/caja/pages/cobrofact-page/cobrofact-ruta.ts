import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CobroFact } from './cobrofact';

const routes: Routes = [
  {path:"",
    component:CobroFact

  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaCobroFact { }
