import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Usuario } from './usuario';
import { RutaUsuario } from './usuario-ruta';

@NgModule({
  declarations: [Usuario],
  imports: [
    CommonModule,
    RutaUsuario,
    ReactiveFormsModule,
    FormsModule,
  ],
  providers: [],
  bootstrap: [Usuario]
})
export class ModuloUsuario { }

