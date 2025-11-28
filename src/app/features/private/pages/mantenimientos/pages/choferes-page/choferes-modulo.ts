import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Choferes } from './choferes';
import { RutaChoferes } from './choferes-ruta';


@NgModule({
  declarations: [
    Choferes
  ],
  imports: [
    CommonModule,
    RutaChoferes,
    ReactiveFormsModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [Choferes]
})
export class ModuloChoferes { }
