import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { RutaSalidafactura } from './salidafactura';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

const routes: Routes = [
  {
    path: "",
    component: RutaSalidafactura   // 👈 este es el que se va a mostrar
  }
];

@NgModule({
  declarations: [
    RutaSalidafactura

    // No Salidafactura declaration since it does not exist
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule.forChild(routes)
  ],
  exports: [
  ],
  providers: [],
  bootstrap: [] // No Salidafactura bootstrap since it does not exist
})
export class ModuloSalidafactura { }
