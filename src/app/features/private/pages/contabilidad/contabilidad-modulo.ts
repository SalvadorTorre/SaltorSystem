import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Contabilidad } from './contabilidad';
import { RutaContabilidad } from './contabilidad-ruta';
import { FacturasPendientesComponent } from './pages/facturas-pendientes/facturas-pendientes';
import { NotaCreditoComponent } from './pages/nota-credito/nota-credito';
import { Reporte607Component } from './pages/reporte-607/reporte-607';
import { GastosMenoresComponent } from './pages/gastos-menores/gastos-menores';

@NgModule({
  declarations: [Contabilidad, FacturasPendientesComponent, Reporte607Component, NotaCreditoComponent, GastosMenoresComponent],
  imports: [CommonModule, FormsModule, RutaContabilidad],
  providers: [],
})
export class ModuloContabilidad {}
