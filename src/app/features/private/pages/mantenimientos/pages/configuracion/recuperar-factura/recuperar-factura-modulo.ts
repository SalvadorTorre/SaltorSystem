import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { RecuperarFacturaPage } from './recuperar-factura';

const routes: Routes = [{ path: '', component: RecuperarFacturaPage }];

@NgModule({
  declarations: [RecuperarFacturaPage],
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes)],
})
export class RecuperarFacturaModulo {}
