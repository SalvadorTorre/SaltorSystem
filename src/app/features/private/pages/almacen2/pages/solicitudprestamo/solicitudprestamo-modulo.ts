import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SolicitudPrestamo } from './solicitudprestamo';

const routes: Routes = [
  {
    path: '',
    component: SolicitudPrestamo,
  },
];

@NgModule({
  declarations: [SolicitudPrestamo],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule.forChild(routes)],
})
export class ModuloSolicitudPrestamo {}
