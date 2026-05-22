import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PendienteEntregaComponent } from './pendienteentrega';

const routes: Routes = [
  { path: '', component: PendienteEntregaComponent }
];

@NgModule({
  declarations: [PendienteEntregaComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule.forChild(routes)
  ],
  providers: []
})
export class ModuloPendienteEntrega {}
