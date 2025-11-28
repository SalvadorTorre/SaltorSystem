import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ContFacturaPage } from './contfactura';

const routes: Routes = [
  { path: '', component: ContFacturaPage }
];

@NgModule({
  declarations: [ContFacturaPage],
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule.forChild(routes)],
})
export class ContFacturaModulo {}