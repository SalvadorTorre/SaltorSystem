import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Sector } from './sector';
import { RutaSector } from './sector-ruta';


@NgModule({
  declarations: [
    Sector
  ],
  imports: [
    CommonModule,
    RutaSector,
    ReactiveFormsModule,
    FormsModule,
  ],
  providers: [],
  bootstrap: [Sector]
})
export class ModuloSector { }
