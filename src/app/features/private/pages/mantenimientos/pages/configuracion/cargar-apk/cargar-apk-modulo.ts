import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { CargarApkPage } from './cargar-apk';

const routes: Routes = [{ path: '', component: CargarApkPage }];

@NgModule({
  declarations: [CargarApkPage],
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes)],
})
export class CargarApkModulo {}
