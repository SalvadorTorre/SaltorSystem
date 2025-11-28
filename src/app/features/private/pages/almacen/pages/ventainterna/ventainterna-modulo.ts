import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Ventainterna } from './ventainterna';
import { RutaVentainterna} from './Ventainterna-ruta';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    Ventainterna,
  ],
  imports: [
    CommonModule,
    RutaVentainterna,
    ReactiveFormsModule,
    FormsModule
  ],
  exports: [
  ],
  providers: [],
})
export class ModuloVentainterna { }
