import { NgModule } from '@angular/core';
import { PrivatePage } from './private.page';
import { PrivateRoutingModule } from './private-routing.module';
import { CommonModule } from '@angular/common';
import { PhoneNumberMaskDirective } from 'src/app/core/directive/phonemask.directive';

@NgModule({
  declarations: [
    PrivatePage,
  ],
  imports: [
    CommonModule,
    PrivateRoutingModule
  ],

  providers: [],
})
export class PrivateModule { }
