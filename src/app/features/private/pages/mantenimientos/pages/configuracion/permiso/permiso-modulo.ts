import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PermisoPage } from './permiso';

const routes: Routes = [
  { path: '', component: PermisoPage }
];

@NgModule({
  declarations: [PermisoPage],
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes)],
})
export class PermisoModulo {}