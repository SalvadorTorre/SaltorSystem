import { Component, OnInit } from '@angular/core';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import Swal from 'sweetalert2';

type ModoFecha607 = 'fecha' | 'rango';

@Component({
  selector: 'app-reporte-607',
  templateUrl: './reporte-607.html',
  styleUrls: ['./reporte-607.css'],
})
export class Reporte607Component implements OnInit {
  facturas: any[] = [];
  loading = false;
  search = '';
  fecha = '';
  fechaDesde = '';
  fechaHasta = '';
  modoFecha: ModoFecha607 = 'fecha';
  page = 1;
  pageSize = 20;
  total = 0;
  totalPages = 1;

  constructor(private servicioFacturacion: ServicioFacturacion) {}

  ngOnInit(): void {
    this.cargarReporte();
  }

  cargarReporte(): void {
    this.loading = true;
    const params = {
      page: this.page,
      pageSize: this.pageSize,
      search: this.search,
      fecha: this.modoFecha === 'fecha' ? this.fecha : '',
      fechaDesde: this.modoFecha === 'rango' ? this.fechaDesde : '',
      fechaHasta: this.modoFecha === 'rango' ? this.fechaHasta : '',
    };

    this.servicioFacturacion.buscarReporte607Dgii(params).subscribe({
      next: (response: any) => {
        this.facturas = response?.data || [];
        const pagination = response?.pagination || {};
        this.total = Number(pagination.total ?? this.facturas.length ?? 0);
        this.page = Number(pagination.page ?? this.page);
        this.pageSize = Number(pagination.pageSize ?? this.pageSize);
        this.totalPages = Math.max(1, Number(pagination.totalPages ?? Math.ceil(this.total / this.pageSize)));
        this.loading = false;
      },
      error: (error) => {
        console.error('[Reporte607Component] Error cargando Rep. 607', error);
        this.loading = false;
        Swal.fire('Error', 'No se pudo cargar el Rep. 607', 'error');
      },
    });
  }

  aplicarFiltros(): void {
    this.page = 1;
    this.cargarReporte();
  }

  limpiarFiltros(): void {
    this.search = '';
    this.fecha = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.modoFecha = 'fecha';
    this.page = 1;
    this.cargarReporte();
  }

  cambiarModoFecha(modo: ModoFecha607): void {
    this.modoFecha = modo;
    if (modo === 'fecha') {
      this.fechaDesde = '';
      this.fechaHasta = '';
    } else {
      this.fecha = '';
    }
  }

  cambiarPagina(page: number): void {
    const nextPage = Math.min(Math.max(1, page), this.totalPages);
    if (nextPage === this.page) return;
    this.page = nextPage;
    this.cargarReporte();
  }

  cambiarTamanoPagina(): void {
    this.page = 1;
    this.cargarReporte();
  }

  abrirQr(factura: any): void {
    const url = String(factura?.qr_link || '').trim();
    if (!url) {
      Swal.fire('Sin QR', 'Esta factura no tiene link de QR guardado.', 'info');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  copiarQr(factura: any): void {
    const url = String(factura?.qr_link || '').trim();
    if (!url) {
      Swal.fire('Sin QR', 'Esta factura no tiene link de QR guardado.', 'info');
      return;
    }
    navigator.clipboard?.writeText(url)
      .then(() => Swal.fire('Copiado', 'Link de QR copiado al portapapeles.', 'success'))
      .catch((error) => {
        console.error('[Reporte607Component] Error copiando QR', error);
        Swal.fire('Error', 'No se pudo copiar el link de QR.', 'error');
      });
  }

  formatFecha(value: any): string {
    const text = String(value || '').trim();
    if (!text) return 'N/A';
    const dateOnly = text.split('T')[0].split(' ')[0];
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
    return text;
  }

  estadoClase(factura: any): string {
    const estado = String(factura?.estado_dgii || factura?.estado_envio_dgii || '').trim().toLowerCase();
    if (estado.includes('aceptado')) return 'status-pill status-ok';
    if (estado.includes('rechaz') || estado.includes('error')) return 'status-pill status-error';
    if (estado.includes('condicional')) return 'status-pill status-warning';
    return 'status-pill status-neutral';
  }

  estadoTexto(factura: any): string {
    return String(factura?.estado_dgii || factura?.estado_envio_dgii || 'Sin estado').trim();
  }

  get rangoActual(): string {
    if (this.modoFecha === 'fecha' && this.fecha) return this.formatFecha(this.fecha);
    if (this.modoFecha === 'rango' && (this.fechaDesde || this.fechaHasta)) {
      return `${this.fechaDesde ? this.formatFecha(this.fechaDesde) : 'Inicio'} - ${this.fechaHasta ? this.formatFecha(this.fechaHasta) : 'Hoy'}`;
    }
    return 'Todas las fechas';
  }

  get pageItems(): number[] {
    const maxVisible = 5;
    const start = Math.max(1, Math.min(this.page - 2, this.totalPages - maxVisible + 1));
    const end = Math.min(this.totalPages, start + maxVisible - 1);
    const pages: number[] = [];
    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  }
}
