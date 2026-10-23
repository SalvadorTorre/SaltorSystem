import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PlataformaComponent } from './plataforma';

const routes: Routes = [
  { path: '', component: PlataformaComponent },
  {
    // Crear / editar empresas, sus sucursales y eNCF (antes en Mantenimientos).
    path: 'empresas',
    loadChildren: () =>
      import('../mantenimientos/pages/empresas-page/empresas-modulo').then(
        (m) => m.ModuloEmpresas,
      ),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RutaPlataforma {}
