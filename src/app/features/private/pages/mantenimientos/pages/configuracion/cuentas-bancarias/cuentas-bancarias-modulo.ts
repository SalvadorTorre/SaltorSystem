import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { CuentasBancariasPage } from './cuentas-bancarias';

const routes: Routes = [{ path: '', component: CuentasBancariasPage }];

@NgModule({
  declarations: [CuentasBancariasPage],
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes)],
})
export class CuentasBancariasModulo {}
