import { Component } from '@angular/core';

@Component({
  selector: 'facturacion',
  templateUrl: './reporte.html',
  styleUrls: ['./reporte.css']
})
export class Reporte {
// pendiente.component.ts o el componente que maneja el menú
openMenu: string | null = null;

toggleMenu(menu: string) {
  this.openMenu = this.openMenu === menu ? null : menu;
}
closeMenu() {
  this.openMenu = null;
}
}