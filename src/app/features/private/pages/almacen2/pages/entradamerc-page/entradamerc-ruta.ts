import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EntradaMercComponent } from './entradamerc';

const routes: Routes = [
  {
    path: '',
    component: EntradaMercComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaEntradaMerc { }