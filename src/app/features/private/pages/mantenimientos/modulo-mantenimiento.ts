import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { Mantenimiento } from './mantenimiento';
import { RutaMantenimiento } from './ruta-matenimiento';

@NgModule({
  declarations: [
    Mantenimiento
  ],
  imports: [
    CommonModule,
    RutaMantenimiento
  ],
  providers: [],
  bootstrap: [Mantenimiento]
})
export class ModuloMantenimiento { }
