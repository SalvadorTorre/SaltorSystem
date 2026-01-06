import { FormsModule, ReactiveFormsModule } from '@angular/forms';  // Importa ReactiveFormsModule
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pendiente} from './pendiente';
import { RutaPendiente } from './pendiente-ruta';

@NgModule({
  declarations: [
    Pendiente
  ],
  imports: [
    CommonModule,
    RutaPendiente,
  //  BrowserModule,
   // ReactiveFormsModule
   ReactiveFormsModule,
    FormsModule,
  ],
  providers: [],
})
export class ModuloPendiente { }
