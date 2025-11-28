import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Choferes } from './choferes';

const routes: Routes = [
  {path:"",
    component:Choferes

  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaChoferes { }
