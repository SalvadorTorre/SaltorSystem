import { FormsModule, ReactiveFormsModule } from '@angular/forms';  // Importa ReactiveFormsModule
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { ControlFact} from './controlfact';
import { RutaControlFact } from './controlfact-ruta';

@NgModule({
  declarations: [
    ControlFact
  ],
  imports: [
    CommonModule,
    RutaControlFact,
  //  BrowserModule,
   // ReactiveFormsModule
   ReactiveFormsModule,
    FormsModule,
  ],
  providers: [],
  bootstrap: [ControlFact]
})
export class ModuloControlFact { }
