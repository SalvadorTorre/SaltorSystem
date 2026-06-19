import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VentasVendedor } from './ventas-vendedor';
import { VentasVendedorRoutingModule } from './ventas-vendedor-ruta';

@NgModule({
  declarations: [VentasVendedor],
  imports: [
    CommonModule,
    FormsModule,
    VentasVendedorRoutingModule,
  ],
})
export class VentasVendedorModulo {}
