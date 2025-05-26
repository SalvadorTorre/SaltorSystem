import { FormsModule, ReactiveFormsModule } from '@angular/forms';  // Importa ReactiveFormsModule
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { CobroFact} from './cobrofact';
//import { CobroFact } from './cobrofact-page/';

import { RutaCobroFact } from './cobrofact-ruta';

@NgModule({
  declarations: [
    CobroFact
  ],
  imports: [
    CommonModule,
    RutaCobroFact,
  //  BrowserModule,
   // ReactiveFormsModule
   ReactiveFormsModule,
    FormsModule,
  ],
  providers: [],
  bootstrap: [CobroFact]
})
export class ModuloCobroFact { }
