import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { ColaDgiiPage } from './cola-dgii';

const routes: Routes = [{ path: '', component: ColaDgiiPage }];

@NgModule({
  declarations: [ColaDgiiPage],
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes)],
})
export class ColaDgiiModulo {}
