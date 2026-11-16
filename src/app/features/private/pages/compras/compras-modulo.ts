import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComprasComponent } from './compras';
import { RutaCompras } from './compras-ruta';

@NgModule({
  declarations: [ComprasComponent],
  imports: [CommonModule, RutaCompras],
})
export class ModuloCompras {}
