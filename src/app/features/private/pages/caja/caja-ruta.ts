
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Caja, } from './caja';

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
          loadChildren: () => import('./pages/cobrofact-page/cobrofact-modulo').then(m => m.ModuloCobroFact)
        },

        
      ]
    }
  ];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaCaja { }

