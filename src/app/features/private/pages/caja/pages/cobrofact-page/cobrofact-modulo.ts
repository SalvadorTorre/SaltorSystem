import { FormsModule, ReactiveFormsModule } from '@angular/forms';  // Importa ReactiveFormsModule
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CobroFact} from './cobrofact';
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
})
export class ModuloCobroFact { }
