import { Component } from '@angular/core';

@Component({
  selector: 'Mantenimiento',
  templateUrl: './mantenimiento.html',
  styleUrls: ['./mantenimiento.css']
})
export class Mantenimiento {
  openMenu: string | null = null;

  toggleMenu(menu: string) {
    this.openMenu = this.openMenu === menu ? null : menu;
  }

  closeMenu() {
    this.openMenu = null;
  }
}
