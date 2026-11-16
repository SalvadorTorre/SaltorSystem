import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrdenCompraComponent } from './orden-compra';
import { RutaOrdenCompra } from './orden-compra-ruta';

@NgModule({
  declarations: [OrdenCompraComponent],
  imports: [CommonModule, FormsModule, RutaOrdenCompra],
})
export class ModuloOrdenCompra {}
