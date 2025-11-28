import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GrupoMercancias } from './grupomerc';
import { RutaGrupoMercancias } from './grupomerc-ruta';


@NgModule({
  declarations: [
    GrupoMercancias
  ],
  imports: [
    CommonModule,
    RutaGrupoMercancias,
    ReactiveFormsModule,
  ],
  providers: [],
})
export class ModuloGrupoMercancias { }
