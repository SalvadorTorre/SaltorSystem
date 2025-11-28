import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Rnc } from './rnc';


@NgModule({
  declarations: [
    Rnc],
  imports: [
    CommonModule,
    Rnc,
    ReactiveFormsModule,
    FormsModule
  ],
  providers: [],
})
export class ModuloRnc { }
