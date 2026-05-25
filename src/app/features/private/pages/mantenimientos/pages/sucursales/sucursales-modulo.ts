import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SucursalesPageComponent } from './sucursales';
import { RutaSucursales } from './sucursales-ruta';

@NgModule({
  declarations: [SucursalesPageComponent],
  imports: [CommonModule, FormsModule, RutaSucursales],
})
export class ModuloSucursales {}
