import { Component, OnInit } from '@angular/core';
import { FacturaDgiiService } from 'src/app/core/services/facturacion/factura/factura-dgii.service';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { ServicioEmpresa } from 'src/app/core/services/mantenimientos/empresas/empresas.service';
import { ServicioSucursal } from 'src/app/core/services/mantenimientos/sucursal/sucursal.service';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';

type ModoFecha607 = 'fecha' | 'rango';
type FormaPago607Key =
  | 'efectivo'
  | 'chequeTransferenciaDeposito'
  | 'tarjetaCreditoDebito'
  | 'ventaCredito'
  | 'bonosCertificados'
  | 'permuta'
  | 'otras';

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
  empresaFiltro = '';
  sucursalFiltro = '';
  modoFecha: ModoFecha607 = 'fecha';
  page = 1;
  pageSize = 20;
  total = 0;
  totalPages = 1;
  facturaReenviando = '';
  exportandoXls = false;
  empresas: any[] = [];
  sucursales: any[] = [];
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
  readonly columnasFormaPago607: { key: FormaPago607Key; title: string }[] = [
    { key: 'efectivo', title: 'Efectivo' },
    { key: 'chequeTransferenciaDeposito', title: 'Cheque / Transferencia / Deposito' },
    { key: 'tarjetaCreditoDebito', title: 'Tarjeta de Credito / Debito' },
    { key: 'ventaCredito', title: 'Venta a Credito' },
    { key: 'bonosCertificados', title: 'Bonos o Certificados' },
    { key: 'permuta', title: 'Permuta' },
    { key: 'otras', title: 'Otras Formas de Venta' },
  ];

  constructor(
    private servicioFacturacion: ServicioFacturacion,
    private facturaDgiiService: FacturaDgiiService,
    private servicioEmpresa: ServicioEmpresa,
    private servicioSucursal: ServicioSucursal,
  ) {}

  ngOnInit(): void {
    this.cargarCatalogosFiltro();
    this.cargarReporte();
  }

  private cargarCatalogosFiltro(): void {
    this.servicioEmpresa.buscarTodasEmpresa(1, 500).subscribe({
      next: (response: any) => {
        this.empresas = Array.isArray(response?.data) ? response.data : [];
      },
      error: (error) => {
        console.error('[Reporte607Component] Error cargando empresas', error);
      },
    });

    this.servicioSucursal.buscarTodasSucursal().subscribe({
      next: (response: any) => {
        this.sucursales = Array.isArray(response?.data) ? response.data : [];
      },
      error: (error) => {
        console.error('[Reporte607Component] Error cargando sucursales', error);
      },
    });
  }

  cargarReporte(): void {
    this.loading = true;
    const params = {
      page: this.page,
      pageSize: this.pageSize,
      search: this.search,
      fecha: '',
      fechaDesde: this.fechaDesde,
      fechaHasta: this.fechaHasta,
      tipoComprobante: this.tipoComprobante,
      estadoDgii: this.estadoDgii,
      empresa: this.empresaFiltro,
      sucursal: this.sucursalFiltro,
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
    this.empresaFiltro = '';
    this.sucursalFiltro = '';
    this.modoFecha = 'rango';
    this.page = 1;
    this.cargarReporte();
  }

  onEmpresaFiltroChange(): void {
    if (!this.empresaFiltro) return;
    const existeSucursal = this.sucursalesFiltradas.some(
      (sucursal) => String(sucursal.cod_sucursal ?? '') === String(this.sucursalFiltro),
    );
    if (!existeSucursal) {
      this.sucursalFiltro = '';
    }
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

  async exportarXls(): Promise<void> {
    if (this.exportandoXls || this.loading) return;
    this.exportandoXls = true;

    try {
      const rows = await this.cargarFacturasExportacion();
      if (!rows.length) {
        Swal.fire('Sin datos', 'No hay registros para exportar con los filtros actuales.', 'info');
        return;
      }

      const html = this.construirHtmlXls(rows);
      const blob = new Blob(['\ufeff', html], {
        type: 'application/vnd.ms-excel;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte-607-${this.nombrePeriodoArchivo()}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('[Reporte607Component] Error exportando Rep. 607 XLS', error);
      Swal.fire(
        'Error',
        String(error?.message || 'No se pudo exportar el Rep. 607 a XLS.'),
        'error',
      );
    } finally {
      this.exportandoXls = false;
    }
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

  async reenviarDgii(factura: any): Promise<void> {
    if (!this.puedeReenviar(factura)) return;
    const codigo = String(factura?.fa_codFact || factura?.fa_codfact || '').trim();
    if (!codigo || this.facturaReenviando) return;

    const confirmacion = await Swal.fire({
      title: 'Reenviar a DGII',
      text: `Se reenviara la factura ${codigo} usando el comprobante actual.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Si, reenviar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
    });
    if (!confirmacion.isConfirmed) return;

    this.facturaReenviando = codigo;
    try {
      await this.facturaDgiiService.reenviar(factura, (text) => {
        if (Swal.isVisible()) {
          Swal.update({ title: 'Reenviando...', text });
          return;
        }
        Swal.fire({
          title: 'Reenviando...',
          text,
          allowOutsideClick: false,
          allowEscapeKey: false,
          didOpen: () => Swal.showLoading(),
        });
      });
      Swal.close();
      await Swal.fire('Completado', `La factura ${codigo} fue reenviada a DGII.`, 'success');
      this.cargarReporte();
    } catch (error: any) {
      console.error('[Reporte607Component] Error reenviando factura a DGII', error);
      Swal.fire(
        'Error',
        String(
          error?.error?.message ||
            error?.error?.details ||
            error?.details?.message ||
            error?.message ||
            'No se pudo reenviar la factura a DGII.',
        ),
        'error',
      );
      this.cargarReporte();
    } finally {
      this.facturaReenviando = '';
    }
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

  puedeReenviar(factura: any): boolean {
    const estado = this.estadoTexto(factura).toLowerCase();
    return estado.includes('rechaz') || estado.includes('error');
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
    if (this.fechaDesde || this.fechaHasta) {
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

  get sucursalesFiltradas(): any[] {
    const empresa = String(this.empresaFiltro || '').trim().toUpperCase();
    if (!empresa) return this.sucursales;
    return this.sucursales.filter(
      (sucursal) => String(sucursal.cod_empre || '').trim().toUpperCase() === empresa,
    );
  }

  private escapeHtml(value: any): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private async cargarFacturasExportacion(): Promise<any[]> {
    const pageSize = 1000;
    const rows: any[] = [];

    for (let page = 1; ; page += 1) {
      const response = await firstValueFrom(this.servicioFacturacion.buscarReporte607Dgii({
        page,
        pageSize,
        search: this.search,
        fecha: '',
        fechaDesde: this.fechaDesde,
        fechaHasta: this.fechaHasta,
        tipoComprobante: this.tipoComprobante,
        estadoDgii: this.estadoDgii,
        empresa: this.empresaFiltro,
        sucursal: this.sucursalFiltro,
      }));

      const pageRows = Array.isArray(response?.data) ? response.data : [];
      rows.push(...pageRows);

      const pagination = response?.pagination || {};
      const totalPages = Math.max(1, Number(pagination.totalPages || 1));
      if (pageRows.length < pageSize || page >= totalPages) break;
    }

    return rows;
  }

  private construirHtmlXls(rows: any[]): string {
    const body = rows.map((factura) => {
      const estado = this.estadoTexto(factura);
      const exportarMontos = !this.esRechazadoOError(estado);
      const itbisRaw = factura.fa_itbiFact ?? factura.fa_itbifact;
      const montoRaw = factura.fa_valFact ?? factura.fa_valfact;
      const itbis = this.numeroXls(itbisRaw);
      const monto = this.numeroXls(montoRaw);
      const montosFormaPago = this.montosPorFormaPago(factura, montoRaw);
      const subtotal = this.numeroXls(this.numeroValor(montoRaw) - this.numeroValor(itbisRaw));
      const montoExento = this.numeroXls(
        factura.monto_exento ??
          factura.montoExento ??
          factura.fa_montoexento ??
          factura.fa_montoExento ??
          0,
      );
      const montoNoFacturable = this.numeroXls(
        factura.monto_no_facturable ??
          factura.montoNoFacturable ??
          factura.fa_montonofacturable ??
          factura.fa_montoNoFacturable,
        '',
      );

      return `
        <tr>
          <td class="text">${this.escapeHtml(factura.fa_rncFact || factura.fa_rncfact || '')}</td>
          <td class="text">${this.escapeHtml(factura.fa_ncfFact || factura.fa_ncffact || factura.ecf || '')}</td>
          <td class="text">${this.escapeHtml(this.encfModificado(factura))}</td>
          <td class="date">${this.escapeHtml(this.fechaXls(factura.fa_fecFact || factura.fa_fecfact, true))}</td>
          <td class="date">${this.escapeHtml(this.fechaXls(this.fechaRecepcionDgii(factura), false))}</td>
          <td class="text">${this.escapeHtml(this.aprobacionComercial(factura))}</td>
          <td class="date">${this.escapeHtml(this.fechaXls(this.fechaAprobacionComercial(factura), false))}</td>
          <td>${this.escapeHtml(estado)}</td>
          <td class="text">${this.escapeHtml(this.formaPagoTexto(factura))}</td>
          <td class="number">${exportarMontos ? itbis : ''}</td>
          <td class="number">${exportarMontos ? monto : ''}</td>
          ${this.columnasFormaPago607
            .map((columna) => `<td class="number">${exportarMontos ? montosFormaPago[columna.key] : ''}</td>`)
            .join('')}
          <td class="number">${exportarMontos ? subtotal : ''}</td>
          <td class="number">${exportarMontos ? montoExento : ''}</td>
          <td class="number">${exportarMontos ? montoNoFacturable : ''}</td>
        </tr>
      `;
    }).join('');

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px; }
            th { background: #ffffff; color: #000000; font-weight: bold; white-space: nowrap; }
            th, td { border: 1px solid #cbd5e1; padding: 3px 4px; vertical-align: top; }
            .text { mso-number-format: "\\@"; }
            .number { mso-number-format: "#,##0.00"; text-align: right; }
            .date { mso-number-format: "dd/mm/yyyy h:mm:ss AM/PM"; white-space: nowrap; }
          </style>
        </head>
        <body>
          <table>
            <tr>
              <th>RNC Receptor</th>
              <th>ENCF</th>
              <th>ENCF Modificado</th>
              <th>Fecha Comprobante</th>
              <th>Fecha Recepción</th>
              <th>Aprobación Comercial</th>
              <th>Fecha Aprobación Comercial</th>
              <th>Estado</th>
              <th>Forma de Pago</th>
              <th>ITBIS Facturado</th>
              <th>Monto Total</th>
              ${this.columnasFormaPago607
                .map((columna) => `<th>${this.escapeHtml(columna.title)}</th>`)
                .join('')}
              <th>Subtotal</th>
              <th>Monto Exento</th>
              <th>Monto No Facturable</th>
            </tr>
            ${body}
          </table>
        </body>
      </html>
    `;
  }

  private esRechazadoOError(estado: string): boolean {
    const normalizado = String(estado || '').toLowerCase();
    return normalizado.includes('rechaz') || normalizado.includes('error');
  }

  private numeroXls(value: any, fallback = '0'): string {
    if (value === null || value === undefined || value === '') return fallback;
    const numero = Number(value);
    if (!Number.isFinite(numero)) return fallback;
    return String(Math.round(numero * 100) / 100);
  }

  private numeroValor(value: any): number {
    const numero = Number(value);
    return Number.isFinite(numero) ? numero : 0;
  }

  private montosPorFormaPago(factura: any, montoRaw: any): Record<FormaPago607Key, string> {
    const result: Record<FormaPago607Key, string> = {
      efectivo: '',
      chequeTransferenciaDeposito: '',
      tarjetaCreditoDebito: '',
      ventaCredito: '',
      bonosCertificados: '',
      permuta: '',
      otras: '',
    };
    const key = this.formaPago607Key(factura);
    result[key] = this.numeroXls(montoRaw);
    return result;
  }

  private formaPago607Key(factura: any): FormaPago607Key {
    const codigo = String(factura?.fa_codfpago ?? factura?.fa_codFpago ?? '').trim();
    const descripcion = this.normalizarTexto(
      factura?.fp_descfpago ??
        factura?.formaPagoDescripcion ??
        factura?.forma_pago ??
        factura?.formaPago ??
        '',
    );

    if (codigo === '1' || descripcion.includes('efectivo')) return 'efectivo';
    if (codigo === '2' || descripcion.includes('credito')) return 'ventaCredito';
    if (
      codigo === '3' ||
      codigo === '4' ||
      descripcion.includes('cheque') ||
      descripcion.includes('transfer') ||
      descripcion.includes('deposit')
    ) {
      return 'chequeTransferenciaDeposito';
    }
    if (codigo === '5' || descripcion.includes('tarjeta')) return 'tarjetaCreditoDebito';
    if (descripcion.includes('bono') || descripcion.includes('certificado')) return 'bonosCertificados';
    if (descripcion.includes('permuta')) return 'permuta';
    return 'otras';
  }

  private formaPagoTexto(factura: any): string {
    const descripcion = String(
      factura?.fp_descfpago ??
        factura?.formaPagoDescripcion ??
        factura?.forma_pago ??
        factura?.formaPago ??
        '',
    ).trim();
    const codigo = String(factura?.fa_codfpago ?? factura?.fa_codFpago ?? '').trim();
    if (descripcion && codigo) return `${codigo} - ${descripcion}`;
    if (descripcion) return descripcion;

    switch (codigo) {
      case '1':
        return '1 - Efectivo';
      case '2':
        return '2 - Credito';
      case '3':
        return '3 - Cheque';
      case '4':
        return '4 - Transferencia o Deposito';
      case '5':
        return '5 - Tarjeta Credito';
      default:
        return codigo;
    }
  }

  private normalizarTexto(value: any): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private fechaXls(value: any, fechaComprobante: boolean): string {
    const text = String(value || '').trim();
    if (!text) return '';

    const dateOnly = text.split('T')[0].split(' ')[0];
    const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
    if (isoDate && fechaComprobante) {
      return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]} 12:00:00 A.M.`;
    }

    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
        .toLocaleString('es-DO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
        .replace(/\s?a\.\s?m\./i, ' A.M.')
        .replace(/\s?p\.\s?m\./i, ' P.M.');
    }

    const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
    if (ddmmyyyy && fechaComprobante) return `${text} 12:00:00 A.M.`;
    return text;
  }

  private encfModificado(factura: any): string {
    return String(
      factura?.encf_modificado ??
        factura?.encfModificado ??
        factura?.fa_ncffact_modificado ??
        factura?.fa_ncfFactModificado ??
        '',
    ).trim();
  }

  private aprobacionComercial(factura: any): string {
    return String(
      this.valorDgii(factura, [
        'aprobacion_comercial',
        'aprobacionComercial',
        'aprobacionComercialEstado',
        'AprobacionComercial',
      ]) || '',
    ).trim();
  }

  private fechaAprobacionComercial(factura: any): any {
    return this.valorDgii(factura, [
      'fecha_aprobacion_comercial',
      'fechaAprobacionComercial',
      'FechaAprobacionComercial',
      'fecha_aprobacion',
    ]);
  }

  private fechaRecepcionDgii(factura: any): any {
    return this.valorDgii(factura, [
      'fecha_recepcion',
      'fechaRecepcion',
      'FechaRecepcion',
      'fechaRecepcionDgii',
      'received_at',
      'recepcion',
    ]) || factura?.dgii_updated_at || factura?.fec_firma || '';
  }

  private valorDgii(factura: any, keys: string[]): any {
    const fuentes = [
      factura,
      factura?.dgii_response_json,
      factura?.dgii_response_raw,
      factura?.dgii_response_json?.data,
      factura?.dgii_response_raw?.data,
      factura?.dgii_response_json?.details,
      factura?.dgii_response_raw?.details,
    ].filter(Boolean);

    for (const fuente of fuentes) {
      for (const key of keys) {
        if (fuente && fuente[key] !== undefined && fuente[key] !== null && fuente[key] !== '') {
          return fuente[key];
        }
      }
    }
    return '';
  }

  private nombrePeriodoArchivo(): string {
    const desde = this.fechaDesde || 'inicio';
    const hasta = this.fechaHasta || 'hoy';
    return `${desde}-${hasta}`.replace(/[^0-9a-zA-Z_-]/g, '');
  }
}
