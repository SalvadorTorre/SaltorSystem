import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { Mantenimiento } from './mantenimiento';
import { RutaMantenimiento } from './ruta-matenimiento';
import { PhoneNumberMaskDirective } from 'src/app/core/directive/phonemask.directive';

@NgModule({
  declarations: [
    Mantenimiento,
    PhoneNumberMaskDirective
  ],
  imports: [
    CommonModule,
    RutaMantenimiento
  ],
  exports: [
    PhoneNumberMaskDirective
  ],
  providers: [],
  bootstrap: [Mantenimiento]
})
export class ModuloMantenimiento { }
