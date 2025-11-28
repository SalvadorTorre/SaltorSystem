import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { Suplidor } from './suplidor';
import { RutaSuplidor } from './suplidor-ruta';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    Suplidor ],
  imports: [
    CommonModule,
    RutaSuplidor,
    ReactiveFormsModule,
    FormsModule,
  ],
  providers: [],
  bootstrap: [Suplidor]
})
export class ModuloSuplidor { }
