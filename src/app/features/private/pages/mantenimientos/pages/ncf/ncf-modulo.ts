import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NcfComponent} from './ncf';
import { RutaNcf } from './ncf-ruta';


@NgModule({
  declarations: [
    NcfComponent
  ],
  imports: [
    CommonModule,
    RutaNcf,
    ReactiveFormsModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [NcfComponent]
})
export class ModuloNcf { }
