import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cliente } from './cliente';
import { RutaCliente } from './cliente-ruta';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [Cliente],
  imports: [CommonModule, RutaCliente, ReactiveFormsModule, FormsModule],

  providers: [],
})
export class ModuloCliente {}
