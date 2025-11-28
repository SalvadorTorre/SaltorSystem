import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NcfComponent} from './ncf';

const routes: Routes = [
  {path:"",
    component:NcfComponent

  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RutaNcf { }
