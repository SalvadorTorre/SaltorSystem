import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { Inventario } from './inventario';
import { RutaInventario } from './inventario-ruta';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    Inventario
  ],
  imports: [
    CommonModule,
    RutaInventario,
    ReactiveFormsModule,
    FormsModule,
  ],
  providers: [],
  bootstrap: [Inventario]
})
export class ModuloInventario { }
