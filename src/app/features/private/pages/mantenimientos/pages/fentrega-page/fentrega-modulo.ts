import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Fentrega } from './fentrega';
import { RutaFentrega } from './fentrega-ruta';

@NgModule({
  declarations: [Fentrega],
  imports: [
    CommonModule,
    RutaFentrega,
    ReactiveFormsModule,
    FormsModule,
  ],
  providers: [],
  bootstrap: [Fentrega]
})
export class ModuloFentrega { }