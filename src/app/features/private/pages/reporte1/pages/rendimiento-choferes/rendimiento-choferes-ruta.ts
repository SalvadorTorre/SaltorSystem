import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RendimientoChoferes } from './rendimiento-choferes';

const routes: Routes = [
  {
    path: '',
    component: RendimientoChoferes,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RendimientoChoferesRoutingModule {}
