import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EstadoServidorPage } from './estado-servidor';

const routes: Routes = [{ path: '', component: EstadoServidorPage }];

@NgModule({
  declarations: [EstadoServidorPage],
  imports: [CommonModule, RouterModule.forChild(routes)],
})
export class EstadoServidorModulo {}
