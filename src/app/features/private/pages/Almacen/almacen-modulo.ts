import { NgModule } from '@angular/core';
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
})
export class ModuloAlmacen { }
