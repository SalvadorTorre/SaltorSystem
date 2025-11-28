import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
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
  bootstrap: [Cotizacion]
})
export class ModuloCotizacion { }
