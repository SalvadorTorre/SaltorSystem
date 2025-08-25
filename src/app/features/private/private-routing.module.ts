import { ModuloMantenimiento } from './pages/mantenimientos/modulo-mantenimiento';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PrivatePage } from './private.page';

const routes: Routes = [
  {
    path: "",
    redirectTo: "home",
    pathMatch: "full"
  },
  {
    path: "",
    component: PrivatePage,
    children: [
      {
        path: "home",
        loadChildren: () => import('./pages/home/modulo-home').then(m => m.ModuloHome)
      },
      {
        path: "mantenimientos",
        loadChildren: () => import('./pages/mantenimientos/modulo-mantenimiento').then(m => m.ModuloMantenimiento)
      },
      {
        path: "facturacion",
        loadChildren: () => import('./pages/facturacion/facturacion-modulo').then(m => m.ModuloFacturacion)
      },
      {
        path: "cotizacion",
        loadChildren: () => import('./pages/cotizacion/cotizacion-modulo').then(m => m.ModuloCotizacion)
      },
      {
        path: "caja",
        loadChildren: () => import('./pages/caja/caja-modulo').then(m => m.ModuloCaja)
      },
      {
        path: "almacen",
        loadChildren: () => import('./pages/almacen/almacen-modulo').then(m => m.ModuloAlmacen)
      },
      {
        path: "despacho",
        loadChildren: () => import('./pages/despacho/despacho.modulo').then(m => m.ModuloDespacho)
      },
      {
        path: "contabilidad",
        loadChildren: () => import('./pages/contabilidad/contabilidad-modulo').then(m => m.ModuloContabilidad)
      },
      {
        path: "reporte",
        loadChildren: () => import('./pages/reporte/reporte-modulo').then(m => m.ModuloReporte)
      }


    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PrivateRoutingModule { }
