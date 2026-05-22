import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ConfiguracionGlobal } from './configuracion-global';
import { RutaConfiguracionGlobal } from './configuracion-global-ruta';

@NgModule({
  declarations: [ConfiguracionGlobal],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RutaConfiguracionGlobal],
})
export class ModuloConfiguracionGlobal {}
