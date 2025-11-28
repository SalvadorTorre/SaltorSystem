import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EncfComponent } from './encf';
import { RutaEncf } from './encf-ruta';


@NgModule({
  declarations: [EncfComponent],
  imports: [CommonModule, RutaEncf, ReactiveFormsModule, FormsModule]
})
export class ModuloEncf {}