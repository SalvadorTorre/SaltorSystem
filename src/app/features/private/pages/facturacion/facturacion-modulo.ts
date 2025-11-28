import { FormsModule, ReactiveFormsModule } from '@angular/forms';  // Importa ReactiveFormsModule
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { Facturacion} from './facturacion';
import { RutaFacturacion } from './facturacion-ruta';

@NgModule({
  declarations: [
    Facturacion
  ],
  imports: [
    CommonModule,
    RutaFacturacion,
  //  BrowserModule,
   // ReactiveFormsModule
   ReactiveFormsModule,
    FormsModule,
  ],
  providers: [],
  bootstrap: [Facturacion]
})
export class ModuloFacturacion { }
