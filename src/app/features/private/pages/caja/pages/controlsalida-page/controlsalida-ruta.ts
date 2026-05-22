import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ControlSalidaCajaComponent } from './controlsalida';

const routes: Routes = [
  {
    path: '',
    component: ControlSalidaCajaComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RutaControlSalidaCaja {}

