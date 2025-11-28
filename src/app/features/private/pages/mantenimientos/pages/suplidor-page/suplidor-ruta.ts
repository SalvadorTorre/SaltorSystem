import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Suplidor } from './suplidor';

const routes: Routes = [
  {path:"",
       component: Suplidor
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaSuplidor { }
