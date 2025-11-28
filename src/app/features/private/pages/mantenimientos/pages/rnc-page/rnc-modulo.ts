import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
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
  bootstrap: [Rnc]
})
export class ModuloRnc { }
