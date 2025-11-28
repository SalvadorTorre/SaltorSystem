import { NgModule } from '@angular/core';
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
})
export class ModuloReporte { }
