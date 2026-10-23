import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PlataformaComponent } from './plataforma';
import { RutaPlataforma } from './plataforma-ruta';

@NgModule({
  declarations: [PlataformaComponent],
  imports: [CommonModule, FormsModule, RouterModule, RutaPlataforma],
})
export class ModuloPlataforma {}
