import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventarioSucursalPageComponent } from './inventario-sucursal';
import { RutaInventarioSucursal } from './inventario-sucursal-ruta';

@NgModule({
  declarations: [InventarioSucursalPageComponent],
  imports: [CommonModule, FormsModule, RutaInventarioSucursal],
})
export class ModuloInventarioSucursal {}
