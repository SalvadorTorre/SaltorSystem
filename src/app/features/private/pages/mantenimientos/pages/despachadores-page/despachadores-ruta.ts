import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Despachadores } from './despachadores';

const routes: Routes = [
  {path:"",
    component:Despachadores

  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaDespachadores { }
