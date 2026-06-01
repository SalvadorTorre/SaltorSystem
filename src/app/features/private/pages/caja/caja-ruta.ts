
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Caja, } from './caja';
import { permissionGuard } from 'src/app/core/guards/permission/permission.guard';

const routes: Routes = [
  {
    path:"",
    redirectTo:"CobroFact",
    pathMatch:"full"
  },

    {path:"",
      component:Caja,
      children:[

        {
          path:"CobroFact",
          canActivate: [permissionGuard],
          data: { accessPath: '/private/caja/CobroFact' },
          loadChildren: () => import('./pages/cobrofact-page/cobrofact-modulo').then(m => m.ModuloCobroFact)
        },
        {
          path:"ControlSalida",
          canActivate: [permissionGuard],
          data: { accessPath: '/private/caja/ControlSalida' },
          loadChildren: () => import('./pages/controlsalida-page/controlsalida-modulo').then(m => m.ModuloControlSalida)
        },
        {
          path:"cuadrecaja",
          canActivate: [permissionGuard],
          data: { accessPath: '/private/caja/cuadrecaja' },
          loadChildren: () => import('./pages/cuadecaja-page/cuadrecaja-modulo').then(m => m.ModuloCuadreCaja)
        },
        {
          path:"reciboingreso",
          canActivate: [permissionGuard],
          data: { accessPath: '/private/caja/reciboingreso' },
          loadChildren: () => import('./pages/reciboingreso-page/reciboingreso-modulo').then(m => m.ModuloReciboIngreso)
        },

        
      ]
    }
  ];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaCaja { }
