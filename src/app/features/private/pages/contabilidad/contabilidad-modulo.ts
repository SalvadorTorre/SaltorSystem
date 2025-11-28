import { NgModule } from '@angular/core';
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
})
export class ModuloContabilidad { }
