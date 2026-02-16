import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DevolucionesComponent } from './devoluciones';
import { RutaDevoluciones } from './devoluciones-ruta';

@NgModule({
  declarations: [DevolucionesComponent],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RutaDevoluciones],
  providers: [],
})
export class ModuloDevoluciones {}
