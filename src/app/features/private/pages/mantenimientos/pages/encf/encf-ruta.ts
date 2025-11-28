import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EncfComponent } from './encf';

const routes: Routes = [
  { path: '', component: EncfComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaEncf {}