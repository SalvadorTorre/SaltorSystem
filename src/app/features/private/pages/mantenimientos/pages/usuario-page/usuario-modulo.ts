import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { Usuario } from './usuario';
import { RutaUsuario } from './usuario-ruta';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    Usuario],
  imports: [
    CommonModule,
    RutaUsuario,
    ReactiveFormsModule,
  ],
  providers: [],
  bootstrap: [Usuario]
})
export class ModuloUsuario { }
