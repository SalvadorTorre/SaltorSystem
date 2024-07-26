import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { Home } from './home';
import { RutaHome } from './ruta-home';
import { NgApexchartsModule } from "ng-apexcharts";


@NgModule({
  declarations: [
    Home
  ],
  imports: [
    CommonModule,
    RutaHome,
    NgApexchartsModule
  ],
  providers: [],
  bootstrap: [Home]
})
export class ModuloHome { }
