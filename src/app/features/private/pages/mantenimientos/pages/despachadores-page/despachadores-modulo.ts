import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Despachadores } from './despachadores';
import { RutaDespachadores } from './despachadores-ruta';

@NgModule({
  declarations: [Despachadores],
  imports: [CommonModule, RutaDespachadores, ReactiveFormsModule],
  providers: [],
})

// models/despachador.ts
export class ModuloDespachadores {}
