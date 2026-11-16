import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ComprasComponent } from './compras';
import { permissionGuard } from 'src/app/core/guards/permission/permission.guard';

const routes: Routes = [
  {
    path: '',
    component: ComprasComponent,
    children: [
      { path: '', redirectTo: 'orden-compra', pathMatch: 'full' },
      {
        path: 'orden-compra',
        canActivate: [permissionGuard],
        data: { accessPath: '/private/compras/orden-compra' },
        loadChildren: () =>
          import('./pages/orden-compra/orden-compra-modulo').then((m) => m.ModuloOrdenCompra),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RutaCompras {}
