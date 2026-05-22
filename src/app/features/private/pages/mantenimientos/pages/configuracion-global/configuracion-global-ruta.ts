import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConfiguracionGlobal } from './configuracion-global';

const routes: Routes = [
  {
    path: '',
    component: ConfiguracionGlobal,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RutaConfiguracionGlobal {}
