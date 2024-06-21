import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { Caja} from './caja';
import { RutaCaja } from './caja-ruta';


@NgModule({
  declarations: [
    Caja
  ],
  imports: [
    CommonModule,
    RutaCaja
  ],
  providers: [],
  bootstrap: [Caja]
})
export class ModuloCaja { }
