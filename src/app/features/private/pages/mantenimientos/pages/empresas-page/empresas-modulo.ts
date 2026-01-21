import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { Empresas } from './empresas';
import { RutaEmpresas } from './empresas-ruta';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    Empresas
  ],
  imports: [
    CommonModule,
    RutaEmpresas,
    ReactiveFormsModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [Empresas]
})
export class ModuloEmpresas { }




