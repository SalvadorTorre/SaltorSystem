import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { Almacen} from './almacen';
import { RutaAlmacen } from './almacen-ruta';


@NgModule({
  declarations: [
    Almacen
  ],
  imports: [
    CommonModule,
    RutaAlmacen
  ],
  providers: [],
  bootstrap: [Almacen]
})
export class ModuloAlmacen { }
