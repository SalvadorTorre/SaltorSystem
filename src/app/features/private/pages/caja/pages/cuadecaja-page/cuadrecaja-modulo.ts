import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CuadreCaja } from './cuadrecaja';
import { RutaCuadreCaja } from './cuadrecaja-ruta';

@NgModule({
  declarations: [
    CuadreCaja
  ],
  imports: [
    CommonModule,
    FormsModule,
    RutaCuadreCaja
  ]
})
export class ModuloCuadreCaja { }
