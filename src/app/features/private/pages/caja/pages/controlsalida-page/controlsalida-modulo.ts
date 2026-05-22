import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ControlSalidaCajaComponent } from './controlsalida';
import { RutaControlSalidaCaja } from './controlsalida-ruta';

@NgModule({
  declarations: [ControlSalidaCajaComponent],
  imports: [CommonModule, FormsModule, RutaControlSalidaCaja],
  providers: [],
})
export class ModuloControlSalida {}

