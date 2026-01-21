import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
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
  bootstrap: [GrupoMercancias]
})
export class ModuloGrupoMercancias { }
