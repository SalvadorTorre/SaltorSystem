import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Fpago } from './fpago';
import { RutaFpago } from './fpago-ruta';


@NgModule({
  declarations: [
    Fpago
  ],
  imports: [
    CommonModule,
    RutaFpago,
    ReactiveFormsModule,
    FormsModule,
  ],
  providers: [],
  bootstrap: [Fpago]
})
export class ModuloFpago { }
