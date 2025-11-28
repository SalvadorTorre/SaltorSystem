import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Sector } from './sector';

const routes: Routes = [
  { path: '', component: Sector }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaSector { }