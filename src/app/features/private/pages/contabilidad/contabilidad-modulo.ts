import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { Contabilidad} from './contabilidad';
import { RutaContabilidad } from './contabilidad-ruta';


@NgModule({
  declarations: [
    Contabilidad
  ],
  imports: [
    CommonModule,
    RutaContabilidad
  ],
  providers: [],
  bootstrap: [Contabilidad]
})
export class ModuloContabilidad { }
