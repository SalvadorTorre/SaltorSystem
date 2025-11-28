import { Component } from '@angular/core';

@Component({
  selector: 'configuracion',
  templateUrl: './configuracion.html',
  styleUrls: ['./configuracion.css']
})
export class Configuracion {
// pendiente.component.ts o el componente que maneja el menú
openMenu: string | null = null;

toggleMenu(menu: string) {
  this.openMenu = this.openMenu === menu ? null : menu;
}
closeMenu() {
  this.openMenu = null;
}
}