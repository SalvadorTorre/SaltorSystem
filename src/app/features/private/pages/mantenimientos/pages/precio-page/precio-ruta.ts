import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PrecioPageComponent } from './precio';

const routes: Routes = [
  {
    path: '',
    component: PrecioPageComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RutaPrecio {}
