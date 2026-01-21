import { NgModule } from '@angular/core';
import { PrivatePage } from './private.page';
import { PrivateRoutingModule } from './private-routing.module';
import { CommonModule } from '@angular/common';

@NgModule({
  declarations: [PrivatePage],
  imports: [CommonModule, PrivateRoutingModule],

  providers: [],
})
export class PrivateModule {}
