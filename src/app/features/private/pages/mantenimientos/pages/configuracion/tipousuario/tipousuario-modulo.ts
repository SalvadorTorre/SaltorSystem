import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { TipousuarioPage } from './tipousuario';

const routes: Routes = [
  { path: '', component: TipousuarioPage }
];

@NgModule({
  declarations: [TipousuarioPage],
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule.forChild(routes)],
})
export class TipousuarioModulo {}