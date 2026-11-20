import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { ConcursosPage } from './concursos';

const routes: Routes = [{ path: '', component: ConcursosPage }];

@NgModule({
  declarations: [ConcursosPage],
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes)],
})
export class ConcursosModulo {}
