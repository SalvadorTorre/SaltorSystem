import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { Cotizacion} from './cotizacion';
import { RutaCotizacion } from './cotizacion-ruta';

@NgModule({
  declarations: [
    Cotizacion
  ],
  imports: [
    CommonModule,
    RutaCotizacion
  ],
  providers: [],
  bootstrap: [Cotizacion]
})
export class ModuloCotizacion { }
