import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { Home } from './home';
import { RutaHome } from './ruta-home';


@NgModule({
  declarations: [
    Home
  ],
  imports: [
    CommonModule,
    RutaHome,
  ],
  providers: [],
  bootstrap: [Home]
})
export class ModuloHome { }
