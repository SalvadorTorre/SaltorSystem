import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Ventainterna } from './ventainterna';
const routes: Routes = [
  {path:"",
    component:Ventainterna

  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaVentainterna { }
