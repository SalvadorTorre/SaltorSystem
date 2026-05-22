import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Caja } from './caja';
import { RutaCaja } from './caja-ruta';

@NgModule({
  declarations: [
    Caja
  ],
  imports: [
    CommonModule,
    RutaCaja
  ]
})
export class ModuloCaja { }
