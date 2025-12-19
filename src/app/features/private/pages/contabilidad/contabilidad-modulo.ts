import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Contabilidad} from './contabilidad';
import { RutaContabilidad } from './contabilidad-ruta';
import { FacturasPendientesComponent } from './pages/facturas-pendientes/facturas-pendientes';


@NgModule({
  declarations: [
    Contabilidad,
    FacturasPendientesComponent
  ],
  imports: [
    CommonModule,
    RutaContabilidad
  ],
  providers: [],
})
export class ModuloContabilidad { }
