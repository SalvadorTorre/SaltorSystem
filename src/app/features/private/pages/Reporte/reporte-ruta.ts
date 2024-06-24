import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Reporte, } from './reporte';

const routes: Routes = [
  {path:"",
    component:Reporte

  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaReporte { }
