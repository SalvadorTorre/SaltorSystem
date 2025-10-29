import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ModuloPage } from './modulo';

const routes: Routes = [
  { path: '', component: ModuloPage }
];

@NgModule({
  declarations: [ModuloPage],
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes)],
  exports: []
})
export class ModuloModulo {}