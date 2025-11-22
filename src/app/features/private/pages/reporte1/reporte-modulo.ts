import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { Reporte } from './reporte';
import { RutaReporte } from './reporte-ruta';

@NgModule({
  declarations: [
    Reporte
  ],
  imports: [
    CommonModule,
    RutaReporte
  ],
  providers: [],
  bootstrap: [Reporte]
})
export class ModuloReporte { }
