import { FormsModule, ReactiveFormsModule } from '@angular/forms';  // Importa ReactiveFormsModule
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RutaDespacho } from './despacho-ruta';
import { DespachoComponent } from './despacho'; // Importa el componente real

@NgModule({
  declarations: [
    DespachoComponent
  ],
  imports: [
    CommonModule,
    RutaDespacho,
    //  BrowserModule,
    // ReactiveFormsModule
    ReactiveFormsModule,
    FormsModule,
  ],

})
export class ModuloDespacho { }
