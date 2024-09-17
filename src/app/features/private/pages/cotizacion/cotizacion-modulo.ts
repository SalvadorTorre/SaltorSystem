import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { Cotizacion } from './cotizacion';
import { RutaCotizacion } from './cotizacion-ruta';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PhoneNumberMaskDirective } from 'src/app/core/directive/phonemask.directive';

@NgModule({
  declarations: [
    Cotizacion,
    PhoneNumberMaskDirective
  ],
  imports: [
    CommonModule,
    RutaCotizacion,
    ReactiveFormsModule,
    FormsModule
  ],
  exports: [
    PhoneNumberMaskDirective
  ],
  providers: [],
  bootstrap: [Cotizacion]
})
export class ModuloCotizacion { }
