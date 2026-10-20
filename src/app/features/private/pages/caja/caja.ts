import { Component, OnInit } from '@angular/core';
import { AccessControlService } from 'src/app/core/services/access/access-control.service';

@Component({
  selector: 'Caja',
  templateUrl: './caja.html',
  styleUrls: ['./caja.css']
})

export class Caja implements OnInit {
  /** Submenu "Auditoria de caja" desplegado dentro del menu. */
  auditoriaAbierta = false;

  constructor(private readonly access: AccessControlService) {}

  ngOnInit(): void {
    void this.access.ensureLoaded();
  }

  toggleAuditoria(event: Event): void {
    // Evita que Bootstrap cierre el menu al abrir el submenu.
    event.preventDefault();
    event.stopPropagation();
    this.auditoriaAbierta = !this.auditoriaAbierta;
  }

  canView(path: string): boolean {
    return this.access.canViewPath(path);
  }
}
