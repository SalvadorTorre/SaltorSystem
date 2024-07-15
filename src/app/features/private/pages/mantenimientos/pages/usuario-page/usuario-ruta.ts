import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Usuario } from './usuario';

const routes: Routes = [
  {path:"",
       component: Usuario
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaUsuario { }
