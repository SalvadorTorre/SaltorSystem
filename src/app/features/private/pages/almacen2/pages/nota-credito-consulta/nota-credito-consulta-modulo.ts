import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { NotaCreditoConsultaAlmacenComponent } from './nota-credito-consulta';

const routes: Routes = [
  { path: '', component: NotaCreditoConsultaAlmacenComponent },
];

@NgModule({
  declarations: [NotaCreditoConsultaAlmacenComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes)],
})
export class ModuloNotaCreditoConsulta {}
