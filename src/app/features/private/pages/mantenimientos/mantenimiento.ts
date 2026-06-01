import { Component, OnInit } from '@angular/core';
import { AccessControlService } from 'src/app/core/services/access/access-control.service';

@Component({
  selector: 'Mantenimiento',
  templateUrl: './mantenimiento.html',
  styleUrls: ['./mantenimiento.css']
})
export class Mantenimiento implements OnInit {
  openMenu: string | null = null;

  constructor(private readonly access: AccessControlService) {}

  ngOnInit(): void {
    void this.access.ensureLoaded();
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
}
