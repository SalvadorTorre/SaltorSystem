import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ModuloPage } from './modulo';
import { HttpClientModule } from '@angular/common/http';
const routes: Routes = [
  { path: '', component: ModuloPage }
];

@NgModule({
  declarations: [ModuloPage],
  imports: [CommonModule, FormsModule, HttpClientModule,RouterModule.forChild(routes)],
        // 👈 obligatori
  exports: []
})
export class ModuloModulo {}