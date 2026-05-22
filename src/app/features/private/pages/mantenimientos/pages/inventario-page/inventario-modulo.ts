import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Inventario } from './inventario';
import { RutaInventario } from './inventario-ruta';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [Inventario],
  imports: [CommonModule, RutaInventario, ReactiveFormsModule, FormsModule],
  providers: [],
})
export class ModuloInventario {}
