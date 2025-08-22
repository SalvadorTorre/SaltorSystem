import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Despacho } from './despacho';
import { RutaDespacho } from './despacho-ruta';

@NgModule({
  declarations: [
    Despacho
  ],
  imports: [
    CommonModule,
    RutaDespacho,
    FormsModule,
    BrowserModule
  ],
  providers: [],
  bootstrap: [Despacho]
})
export class ModuloDespacho { }

