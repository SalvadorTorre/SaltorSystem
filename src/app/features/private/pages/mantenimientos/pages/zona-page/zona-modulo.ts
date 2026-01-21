import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Zona } from './zona';
import { RutaZona } from './zona-ruta';

@NgModule({
  declarations: [Zona],
  imports: [CommonModule, RutaZona, ReactiveFormsModule, FormsModule],
  providers: [],
})
export class ModuloZona {}
