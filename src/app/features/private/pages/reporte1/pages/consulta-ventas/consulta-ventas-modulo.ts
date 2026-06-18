import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConsultaVentas } from './consulta-ventas';
import { ConsultaVentasRoutingModule } from './consulta-ventas-ruta';

@NgModule({
  declarations: [ConsultaVentas],
  imports: [
    CommonModule,
    FormsModule,
    ConsultaVentasRoutingModule
  ]
})
export class ConsultaVentasModulo {}
