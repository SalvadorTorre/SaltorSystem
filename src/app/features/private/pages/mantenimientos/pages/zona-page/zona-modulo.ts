import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Zona } from './zona';
import { RutaZona } from './zona-ruta';


@NgModule({
  declarations: [
    Zona
  ],
  imports: [
    CommonModule,
    RutaZona,
    ReactiveFormsModule,
    FormsModule,
  ],
  providers: [],
  bootstrap: [Zona]
})
export class ModuloZona { }
