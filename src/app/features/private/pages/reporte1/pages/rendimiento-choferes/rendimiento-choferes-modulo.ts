import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RendimientoChoferes } from './rendimiento-choferes';
import { RendimientoChoferesRoutingModule } from './rendimiento-choferes-ruta';

@NgModule({
  declarations: [RendimientoChoferes],
  imports: [
    CommonModule,
    FormsModule,
    RendimientoChoferesRoutingModule,
  ],
})
export class RendimientoChoferesModulo {}
