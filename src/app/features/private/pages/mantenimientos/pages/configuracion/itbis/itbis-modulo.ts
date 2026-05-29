import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { ItbisPage } from './itbis';

const routes: Routes = [{ path: '', component: ItbisPage }];

@NgModule({
  declarations: [ItbisPage],
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes)],
})
export class ItbisModulo {}
