import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-reporte',
  templateUrl: './reporte.html',
  styleUrls: ['./reporte.component.css']
})
export class ReporteComponent {
  openMenu: string | null = null;
  currentReport: string | null = null;

  constructor(private router: Router) {
    // Detectar cambios de ruta para actualizar el título del reporte actual
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.url;
      if (url.includes('movproducto')) {
        this.currentReport = 'Movimientos por Productos';
      } else if (url.includes('entradaProducto')) {
        this.currentReport = 'Movimientos por Grupo';
      } else if (url.includes('salidaProducto')) {
        this.currentReport = 'Movimientos General';
      } else if (url.includes('consultaProducto')) {
        this.currentReport = 'Consulta de Productos';
      } else {
        this.currentReport = null;
      }
    });
  }

  toggleMenu(menu: string): void {
    this.openMenu = this.openMenu === menu ? null : menu;
  }
  
  // Método para cerrar el menú móvil al seleccionar una opción
  closeOffcanvas(): void {
    // Cerrar el offcanvas usando Bootstrap
    const offcanvasElement = document.getElementById('sidebarMenu');
    if (offcanvasElement) {
      const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasElement);
      if (offcanvas) {
        offcanvas.hide();
      }
    }
  }
}