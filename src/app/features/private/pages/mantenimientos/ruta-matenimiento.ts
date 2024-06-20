import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Mantenimiento, } from './mantenimiento';

const routes: Routes = [
  {path:"",
    component:Mantenimiento

  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaMantenimiento { }
