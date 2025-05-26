
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Mantenimiento, } from './mantenimiento';

const routes: Routes = [
  {
    path:"",
    redirectTo:"inventario",
    pathMatch:"full"
  },

    {path:"",
      component:Mantenimiento,
      children:[
        {
          path:"inventario",
          loadChildren: () => import('./pages/inventario-page/inventario-modulo').then(m => m.ModuloInventario)
        },

        {
          path:"cliente",
          loadChildren: () => import('./pages/cliente-page/cliente-modulo').then(m => m.ModuloCliente)
        },

        {
          path:"suplidor",
          loadChildren: () => import('./pages/suplidor-page/suplidor-modulo').then(m => m.ModuloSuplidor)
        },

        {
          path:"zona",
          loadChildren: () => import('./pages/zona-page/zona-modulo').then(m => m.ModuloZona)
        },

        {
          path:"sector",
          loadChildren: () => import('./pages/sector-page/sector-modulo').then(m => m.ModuloSector)
        },
        {
          path:"usuario",
          loadChildren: () => import('./pages/usuario-page/usuario-modulo').then(m => m.ModuloUsuario)
        },
        {
          path:"choferes",
          loadChildren: () => import('./pages/choferes-page/choferes-modulo').then(m => m.ModuloChoferes)
        },
        {
          path:"despachadores",
          loadChildren: () => import('./pages/despachadores-page/despachadores-modulo').then(m => m.ModuloDespachadores)
        },
        {
          path:"Empresas",
          loadChildren: () => import('./pages/empresas-page/empresas-modulo').then(m => m.ModuloEmpresas)
        },
        {
          path:"grupo-mercancias",
          loadChildren: () => import('./pages/grupormerc/grupomerc-modulo').then(m => m.ModuloGrupoMercancias)
        },
      ]
    }
  ];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaMantenimiento { }


