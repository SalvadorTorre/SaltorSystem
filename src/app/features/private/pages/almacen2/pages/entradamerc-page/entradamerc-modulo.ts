
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EntradaMercComponent } from './entradamerc';
import { RutaEntradaMerc } from './entradamerc-ruta';

@NgModule({
  declarations: [
    EntradaMercComponent
  ],
  imports: [
    CommonModule,
    RutaEntradaMerc,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: []
})
export class ModuloEntradaMerc { }
