import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MovimientoProducto } from './movproducto';
import { MovimientoProductoRoutingModule } from './movproducto-ruta';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

@NgModule({
  declarations: [MovimientoProducto],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MovimientoProductoRoutingModule
  ]
})
export class MovimientoProductoModule {}
