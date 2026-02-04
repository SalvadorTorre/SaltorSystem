
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ReciboIngresoComponent } from './reciboingreso';
import { RutaReciboIngreso } from './reciboingreso-ruta';

@NgModule({
  declarations: [
    ReciboIngresoComponent
  ],
  imports: [
    CommonModule,
    RutaReciboIngreso,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: []
})
export class ModuloReciboIngreso { }
