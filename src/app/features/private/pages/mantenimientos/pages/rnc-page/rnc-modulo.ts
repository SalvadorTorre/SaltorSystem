import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Rnc } from './rnc';
import { RutaRnc } from './rnc-ruta';

@NgModule({
  declarations: [Rnc],
  imports: [CommonModule, RutaRnc, ReactiveFormsModule, FormsModule],
  providers: [],
})
export class ModuloRnc {}
