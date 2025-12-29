import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CuadreCajaComponent } from './cuadrecaja';
import { RutaCuadreCaja } from './cuadrecaja-ruta';

@NgModule({
  declarations: [
    CuadreCajaComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RutaCuadreCaja
  ]
})
export class ModuloCuadreCaja { }
