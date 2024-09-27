import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { Cliente } from './cliente';
import { RutaCliente } from './cliente-ruta';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PhoneNumberMaskDirective } from 'src/app/core/directive/phonemask.directive';


@NgModule({
  declarations: [
    Cliente,
    PhoneNumberMaskDirective,
  ],
  imports: [
    CommonModule,
    RutaCliente,
    ReactiveFormsModule,
    FormsModule,
  ],
  exports: [
    PhoneNumberMaskDirective
  ],
  providers: [],
  bootstrap: [Cliente]
})
export class ModuloCliente { }
