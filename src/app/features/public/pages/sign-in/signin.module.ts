import { NgModule } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { CommonModule } from '@angular/common';

import { SignInPageRoutingModule } from "./signin.page-routing.module";
import { SignInPage } from "./signin.page";
import { PublicModule } from "../../public.module";




@NgModule({
  imports: [
    SignInPageRoutingModule,
    PublicModule,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
  ],
  declarations: [
    SignInPage,
  ],

})

export class SignInPageModule { }
