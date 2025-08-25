import { Despacho } from '../../../../core/services/desapacho/despacho.model';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';  // Importa ReactiveFormsModule
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { RutaDespacho } from './despacho-ruta';

@NgModule({
  declarations: [
    Despacho
  ],
  imports: [
    CommonModule,
    RutaDespacho,
    //  BrowserModule,
    // ReactiveFormsModule
    ReactiveFormsModule,
    FormsModule,
  ],
  providers: [],
  bootstrap: [Despacho]
})
export class ModuloDespacho { }
