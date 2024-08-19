import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { PrivatePage } from './private.page';
import { PrivateRoutingModule } from './private-routing.module';
import { CommonModule } from '@angular/common';
import { PhoneNumberMaskDirective } from 'src/app/core/directive/phonemask.directive';

@NgModule({
  declarations: [
    PrivatePage,
    PhoneNumberMaskDirective
  ],
  imports: [
    CommonModule,
    PrivateRoutingModule
  ],
  exports: [
    PhoneNumberMaskDirective
  ],
  providers: [],
  bootstrap: [PrivatePage]
})
export class PrivateModule { }
