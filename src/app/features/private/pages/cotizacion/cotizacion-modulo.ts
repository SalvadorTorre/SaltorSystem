import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cotizacion } from './cotizacion';
import { RutaCotizacion } from './cotizacion-ruta';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    Cotizacion,
  ],
  imports: [
    CommonModule,
    RutaCotizacion,
    ReactiveFormsModule,
    FormsModule
  ],
  exports: [
  ],
  providers: [],
})
export class ModuloCotizacion { }
