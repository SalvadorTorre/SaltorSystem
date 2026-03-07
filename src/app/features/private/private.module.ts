import { NgModule } from '@angular/core';
import { PrivatePage } from './private.page';
import { PrivateRoutingModule } from './private-routing.module';
import { CommonModule } from '@angular/common';
import { PrivateNavbarComponent } from './components/private-navbar/private-navbar.component';

@NgModule({
  declarations: [PrivatePage, PrivateNavbarComponent],
  imports: [CommonModule, PrivateRoutingModule],

  providers: [],
})
export class PrivateModule {}
