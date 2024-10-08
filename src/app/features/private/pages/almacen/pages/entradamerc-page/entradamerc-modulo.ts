import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { Entradamerc } from './entradamerc';
import { RutaEntradamerc } from './entradamerc-ruta';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    Entradamerc,
  ],
  imports: [
    CommonModule,
    RutaEntradamerc,
    ReactiveFormsModule,
    FormsModule
  ],
  exports: [
  ],
  providers: [],
  bootstrap: [Entradamerc]
})
export class ModuloEntradamerc { }
