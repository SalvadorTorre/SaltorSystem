import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Empresas } from './empresas';
import { RutaEmpresas } from './empresas-ruta';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [Empresas],
  imports: [CommonModule, RutaEmpresas, ReactiveFormsModule, FormsModule],
  providers: [],
})
export class ModuloEmpresas {}
