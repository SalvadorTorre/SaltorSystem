import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Contabilidad } from './contabilidad';
import { RutaContabilidad } from './contabilidad-ruta';
import { FacturasPendientesComponent } from './pages/facturas-pendientes/facturas-pendientes';
import { Reporte607Component } from './pages/reporte-607/reporte-607';

@NgModule({
  declarations: [Contabilidad, FacturasPendientesComponent, Reporte607Component],
  imports: [CommonModule, FormsModule, RutaContabilidad],
  providers: [],
})
export class ModuloContabilidad {}
