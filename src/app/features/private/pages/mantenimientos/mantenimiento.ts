import { Component, OnInit } from '@angular/core';
import { AccessControlService } from 'src/app/core/services/access/access-control.service';

@Component({
  selector: 'Mantenimiento',
  templateUrl: './mantenimiento.html',
  styleUrls: ['./mantenimiento.css']
})
export class Mantenimiento implements OnInit {
  openMenu: string | null = null;
  isDesktop = false;

  constructor(private readonly access: AccessControlService) {}

  ngOnInit(): void {
    void this.access.ensureLoaded();
    this.isDesktop = !!window.electronAPI?.isDesktop;
  }

  toggleMenu(menu: string) {
    this.openMenu = this.openMenu === menu ? null : menu;
  }

  closeMenu() {
    this.openMenu = null;
  }

  canView(path: string): boolean {
    return this.access.canViewPath(path);
  }

  async abrirModoDeveloper(): Promise<void> {
    if (!window.electronAPI?.openDevTools) {
      console.warn('DevTools solo esta disponible en la version desktop.');
      return;
    }

    const result = await window.electronAPI.openDevTools();
    if (!result?.success) {
      console.error(result?.error || 'No se pudo abrir la consola developer.');
    }
  }
}
