import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrecioPageComponent } from './precio';
import { RutaPrecio } from './precio-ruta';

@NgModule({
  declarations: [PrecioPageComponent],
  imports: [CommonModule, FormsModule, RutaPrecio],
})
export class ModuloPrecio {}
