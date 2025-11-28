import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Fentrega } from './fentrega';

const routes: Routes = [
  { path: '', component: Fentrega }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaFentrega {}