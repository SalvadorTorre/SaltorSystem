import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ControlFact, } from './controlfact';

const routes: Routes = [
  {path:"",
    component:ControlFact

  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaControlFact { }
