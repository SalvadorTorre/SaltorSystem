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
  tipoComprobante = '';
  estadoDgii = '';
  modoFecha: ModoFecha607 = 'fecha';
  page = 1;
  pageSize = 20;
  total = 0;
  totalPages = 1;
  readonly tiposComprobante = [
    { value: '31', label: 'E31 - Crédito Fiscal' },
    { value: '32', label: 'E32 - Consumo' },
    { value: '41', label: 'E41 - Compras' },
    { value: '43', label: 'E43 - Gastos Menores' },
    { value: '44', label: 'E44 - Regímenes Especiales' },
    { value: '45', label: 'E45 - Gubernamental' },
    { value: '46', label: 'E46 - Exportación' },
    { value: '47', label: 'E47 - Exterior' },
  ];
  readonly estadosDgii = [
    'Aceptado',
    'Aceptado Condicional',
    'Rechazado',
    'En Proceso',
    'Error',
  ];

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
      tipoComprobante: this.tipoComprobante,
      estadoDgii: this.estadoDgii,
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
    this.tipoComprobante = '';
    this.estadoDgii = '';
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

  verRespuestaDgii(factura: any): void {
    const mensajes = this.mensajesDgii(factura);
    const raw =
      factura?.dgii_response_raw ||
      factura?.dgii_response_json ||
      factura?.dgii_mensajes ||
      {};
    const json = this.escapeHtml(JSON.stringify(raw, null, 2));

    Swal.fire({
      width: 820,
      title: `Respuesta DGII ${this.escapeHtml(factura?.fa_ncfFact || factura?.fa_ncffact || '')}`,
      html: `
        <div class="dgii-response-modal">
          <div class="dgii-response-grid">
            <div><span>Estado</span><strong>${this.escapeHtml(this.estadoTexto(factura))}</strong></div>
            <div><span>Código DGII</span><strong>${this.escapeHtml(factura?.dgii_codigo || '-')}</strong></div>
            <div><span>Track ID</span><strong>${this.escapeHtml(factura?.dgii_track_id || '-')}</strong></div>
            <div><span>Seguridad</span><strong>${this.escapeHtml(factura?.codseguridad || '-')}</strong></div>
          </div>
          <div class="dgii-response-section">
            <h4>Mensajes / motivo</h4>
            ${
              mensajes.length
                ? `<ul>${mensajes.map((msg) => `<li>${this.escapeHtml(msg)}</li>`).join('')}</ul>`
                : `<p class="text-muted mb-0">No hay mensajes adicionales registrados.</p>`
            }
          </div>
          <div class="dgii-response-section">
            <h4>Response completo</h4>
            <pre>${json}</pre>
          </div>
        </div>
      `,
      confirmButtonText: 'Cerrar',
      customClass: {
        popup: 'dgii-response-popup',
      },
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
    if (estado.includes('condicional')) return 'status-pill status-warning';
    if (estado.includes('aceptado')) return 'status-pill status-ok';
    if (estado.includes('rechaz') || estado.includes('error')) return 'status-pill status-error';
    if (estado.includes('proceso')) return 'status-pill status-info';
    return 'status-pill status-neutral';
  }

  estadoTexto(factura: any): string {
    return String(factura?.estado_dgii || factura?.estado_envio_dgii || 'Sin estado').trim();
  }

  tipoComprobanteTexto(factura: any): string {
    const tipo = String(factura?.fa_tipoNcf || factura?.fa_tiponcf || '').trim();
    const encf = String(factura?.fa_ncfFact || factura?.fa_ncffact || '').trim();
    const tipoFromEncf = encf.startsWith('E') ? encf.substring(1, 3) : '';
    const value = tipo || tipoFromEncf;
    const found = this.tiposComprobante.find((item) => item.value === value);
    return found?.label || (value ? `E${value}` : 'N/A');
  }

  mensajesDgii(factura: any): string[] {
    const mensajes: string[] = [];
    const add = (value: any) => {
      if (value === null || value === undefined) return;
      if (Array.isArray(value)) {
        value.forEach(add);
        return;
      }
      if (typeof value === 'object') {
        add(value.mensaje || value.message || value.error || value.descripcion);
        return;
      }
      const text = String(value).trim();
      if (text && !mensajes.includes(text)) mensajes.push(text);
    };

    add(factura?.dgii_mensajes);
    add(factura?.dgii_error_message);
    add(factura?.dgii_response_json?.mensajes);
    add(factura?.dgii_response_raw?.mensajes);
    add(factura?.dgii_response_raw?.details?.mensajes);
    add(factura?.dgii_response_raw?.details?.message);
    add(factura?.dgii_response_raw?.message);
    return mensajes;
  }

  primerMensajeDgii(factura: any): string {
    return this.mensajesDgii(factura)[0] || '';
  }

  get rangoActual(): string {
    if (this.modoFecha === 'fecha' && this.fecha) return this.formatFecha(this.fecha);
    if (this.modoFecha === 'rango' && (this.fechaDesde || this.fechaHasta)) {
      return `${this.fechaDesde ? this.formatFecha(this.fechaDesde) : 'Inicio'} - ${this.fechaHasta ? this.formatFecha(this.fechaHasta) : 'Hoy'}`;
    }
    return 'Todas las fechas';
  }

  get totalAceptadas(): number {
    return this.facturas.filter((factura) =>
      this.estadoTexto(factura).toLowerCase().includes('aceptado') &&
      !this.estadoTexto(factura).toLowerCase().includes('condicional')
    ).length;
  }

  get totalCondicionales(): number {
    return this.facturas.filter((factura) =>
      this.estadoTexto(factura).toLowerCase().includes('condicional')
    ).length;
  }

  get totalRechazadas(): number {
    return this.facturas.filter((factura) => {
      const estado = this.estadoTexto(factura).toLowerCase();
      return estado.includes('rechaz') || estado.includes('error');
    }).length;
  }

  get pageItems(): number[] {
    const maxVisible = 5;
    const start = Math.max(1, Math.min(this.page - 2, this.totalPages - maxVisible + 1));
    const end = Math.min(this.totalPages, start + maxVisible - 1);
    const pages: number[] = [];
    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  }

  private escapeHtml(value: any): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
