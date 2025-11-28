import { NgModule } from '@angular/core';
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
})
export class ModuloHome { }
