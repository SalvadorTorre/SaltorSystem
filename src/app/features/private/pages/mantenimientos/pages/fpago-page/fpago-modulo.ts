import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Fpago } from './fpago';
import { RutaFpago } from './fpago-ruta';

@NgModule({
  declarations: [Fpago],
  imports: [CommonModule, RutaFpago, ReactiveFormsModule, FormsModule],
})
export class FpagoModulo {}
