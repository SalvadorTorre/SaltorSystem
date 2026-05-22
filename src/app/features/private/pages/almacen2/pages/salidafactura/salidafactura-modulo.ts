import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SalidafacturaComponent } from './salidafactura';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

const routes: Routes = [
  {
    path: "",
    component: SalidafacturaComponent
  }
];

@NgModule({
  declarations: [
    SalidafacturaComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule.forChild(routes)
  ],
  exports: [
  ],
  providers: [],
})
export class ModuloSalidafactura { }
