import { Component, OnInit } from '@angular/core';
import { FacturaDgiiService } from 'src/app/core/services/facturacion/factura/factura-dgii.service';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { ServicioEmpresa } from 'src/app/core/services/mantenimientos/empresas/empresas.service';
import { ServicioSucursal } from 'src/app/core/services/mantenimientos/sucursal/sucursal.service';
import { ServicioFpago } from 'src/app/core/services/mantenimientos/fpago/fpago.service';
import { NotaCreditoService } from 'src/app/core/services/contabilidad/nota-credito/nota-credito.service';
import { firstValueFrom } from 'rxjs';
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
  fecha = '';
  fechaDesde = '';
  fechaHasta = '';
  tipoComprobante = '';
  estadoDgii = '';
  numeroFactura = '';
  encf = '';
  empresaFiltro = '';
  sucursalFiltro = '';
  modoFecha: ModoFecha607 = 'fecha';
  page = 1;
  pageSize = 20;
  total = 0;
  totalPages = 1;
  facturaReenviando = '';
  facturaEditando = '';
  exportandoXls = false;
  empresas: any[] = [];
  sucursales: any[] = [];
  formasPago: any[] = [];
  consultaRealizada = false;
  readonly tiposComprobante = [
    { value: '31', label: 'E31 - Crédito Fiscal' },
    { value: '32', label: 'E32 - Consumo' },
    { value: '34', label: 'E34 - Nota de Crédito' },
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
    'success',
    'Rechazado',
    'En Proceso',
    'Error',
  ];
  get columnasFormaPago607(): { codigo: string; title: string }[] {
    return [...this.formasPago]
      .sort((a, b) => Number(a?.fp_codfpago || 0) - Number(b?.fp_codfpago || 0))
      .map((forma) => ({
        codigo: String(forma?.fp_codfpago ?? '').trim(),
        title: String(forma?.fp_descfpago ?? '').trim() ||
          `Forma de pago ${forma?.fp_codfpago ?? ''}`,
      }))
      .filter((forma) => !!forma.codigo);
  }

  constructor(
    private servicioFacturacion: ServicioFacturacion,
    private facturaDgiiService: FacturaDgiiService,
    private servicioEmpresa: ServicioEmpresa,
    private servicioSucursal: ServicioSucursal,
    private servicioFpago: ServicioFpago,
    private notaCreditoService: NotaCreditoService,
  ) {}

  /** Total de facturas del filtro actual (sin notas de credito). */
  private totalFacturasFiltro = 0;
  /** Notas de credito (E34) del filtro actual; se muestran despues de las facturas. */
  private notasCreditoFiltro: any[] = [];

  private filtrosNotasCredito(filtroFecha: { fecha: string; fechaDesde: string; fechaHasta: string }) {
    return {
      fecha: filtroFecha.fecha,
      fechaDesde: filtroFecha.fechaDesde,
      fechaHasta: filtroFecha.fechaHasta,
      estadoDgii: this.estadoDgii,
      search: this.numeroFactura || this.encf,
      empresa: this.empresaFiltro,
      sucursal: this.sucursalFiltro,
    };
  }

  // ---- Orden de la lista ----
  ordenarPor: 'fecha' | 'tipo' | 'ncf' = 'fecha';
  ordenDescendente = true;

  /** Codigo de tipo (31, 32, 34, ...) de la factura o nota. */
  tipoCodigo(factura: any): string {
    const tipo = String(factura?.fa_tipoNcf || factura?.fa_tiponcf || '').trim();
    if (tipo) return tipo.replace(/^E/i, '');
    const encf = String(factura?.fa_ncfFact || factura?.fa_ncffact || '').trim().toUpperCase();
    return encf.startsWith('E') ? encf.substring(1, 3) : '';
  }

  /** Color de la columna Tipo segun el comprobante. */
  tipoClase(factura: any): string {
    const tipo = this.tipoCodigo(factura);
    return ['31', '32', '34', '41', '43', '44', '45', '46', '47'].includes(tipo)
      ? `type-chip tipo-${tipo}`
      : 'type-chip';
  }

  cambiarOrden(campo: 'fecha' | 'tipo' | 'ncf'): void {
    if (this.ordenarPor === campo) {
      this.ordenDescendente = !this.ordenDescendente;
    } else {
      this.ordenarPor = campo;
      this.ordenDescendente = campo === 'fecha';
    }
  }

  /** Filas de la pagina actual ordenadas segun el campo elegido. */
  get facturasOrdenadas(): any[] {
    const fecha = (f: any) => String(this.fechaComprobante(f) ?? '').slice(0, 10);
    const ncf = (f: any) => String(f?.fa_ncfFact ?? f?.fa_ncffact ?? '').trim();
    const tipo = (f: any) => this.tipoCodigo(f).padStart(3, '0');
    const comparar = (a: any, b: any): number => {
      let r = 0;
      if (this.ordenarPor === 'tipo') {
        r = tipo(a).localeCompare(tipo(b)) || ncf(a).localeCompare(ncf(b));
      } else if (this.ordenarPor === 'ncf') {
        r = ncf(a).localeCompare(ncf(b));
      } else {
        r = fecha(a).localeCompare(fecha(b)) || ncf(a).localeCompare(ncf(b));
      }
      return this.ordenDescendente ? -r : r;
    };
    return [...this.facturas].sort(comparar);
  }

  private incluyeNotasCredito(): boolean {
    return !this.tipoComprobante || this.tipoComprobante === '34';
  }

  private incluyeFacturas(): boolean {
    return this.tipoComprobante !== '34';
  }

  ngOnInit(): void {
    this.empresaFiltro = this.empresaUsuarioActual();
    this.cargarCatalogosFiltro();
    this.cargarFormasPago();
  }

  private cargarFormasPago(): void {
    this.servicioFpago.obtenerTodosFpago().subscribe({
      next: (response: any) => {
        this.formasPago = Array.isArray(response?.data) ? response.data : [];
      },
      error: (error) => {
        console.error('[Reporte607Component] Error cargando formas de pago', error);
      },
    });
  }

  private cargarCatalogosFiltro(): void {
    this.servicioEmpresa.buscarTodasEmpresa(1, 500).subscribe({
      next: (response: any) => {
        const todas = Array.isArray(response?.data) ? response.data : [];
        const empresaUsuario = this.empresaUsuarioActual().toUpperCase();
        this.empresas = this.esUsuarioRoot()
          ? todas
          : todas.filter((empresa: any) =>
              String(empresa?.cod_empre || '').trim().toUpperCase() === empresaUsuario
            );
        if (!this.esUsuarioRoot() && empresaUsuario) {
          this.empresaFiltro = empresaUsuario;
        }
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

  private empresaUsuarioActual(): string {
    let empresa: any = null;
    try {
      empresa = JSON.parse(localStorage.getItem('empresa') || 'null');
      if (Array.isArray(empresa)) empresa = empresa[0];
    } catch {
      empresa = null;
    }
    return String(
      empresa?.cod_empre ||
      localStorage.getItem('cod_empre') ||
      localStorage.getItem('codigoempresa') ||
      '',
    ).trim();
  }

  esUsuarioRoot(): boolean {
    const tipo = Number(
      localStorage.getItem('idtipoUsuario') ||
      localStorage.getItem('idtipousuario') ||
      localStorage.getItem('tipoUsuario') ||
      0,
    );
    return tipo === 1;
  }

  private fechaIsoFiltro(value: string): string {
    const text = String(value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const match = text.match(/^([0-3]?\d)\/([0-1]?\d)\/(\d{4})$/);
    if (!match) return '';
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }

  private filtrosFechaConsulta(): { fecha: string; fechaDesde: string; fechaHasta: string } {
    const desde = this.fechaIsoFiltro(this.fechaDesde);
    const hasta = this.fechaIsoFiltro(this.fechaHasta);
    if (desde && hasta && desde === hasta) {
      return { fecha: desde, fechaDesde: '', fechaHasta: '' };
    }
    return { fecha: '', fechaDesde: desde, fechaHasta: hasta };
  }

  /**
   * Facturas (RPC del 607, paginada en el servidor y ordenada por fecha
   * descendente) con las notas de credito E34 intercaladas por fecha.
   * Cada nota va en la pagina cuyas facturas cubren su fecha: la pagina p
   * recibe las notas con fecha >= ultima fecha de la pagina p y < ultima
   * fecha de la pagina p-1.
   */
  cargarReporte(): void {
    if (!this.consultaRealizada) return;
    this.loading = true;
    void this.cargarReporteAsync();
  }

  /** Fecha mas antigua (YYYY-MM-DD) de cada pagina de facturas ya consultada. */
  private ultimaFechaPagina = new Map<number, string>();

  private fechaClave(factura: any): string {
    return String(this.fechaComprobante(factura) ?? '').slice(0, 10);
  }

  private async consultarPaginaFacturas(page: number, filtroFecha: any): Promise<any[]> {
    const response: any = await firstValueFrom(this.servicioFacturacion.buscarReporte607Dgii({
      page,
      pageSize: this.pageSize,
      ...filtroFecha,
      tipoComprobante: this.tipoComprobante,
      estadoDgii: this.estadoDgii,
      numeroFactura: this.numeroFactura,
      encf: this.encf,
      empresa: this.empresaFiltro,
      sucursal: this.sucursalFiltro,
    }));
    const filas = Array.isArray(response?.data) ? response.data : [];
    const pagination = response?.pagination || {};
    const total = Number(pagination.total);
    if (page === 1 || (Number.isFinite(total) && total > 0)) {
      this.totalFacturasFiltro = Number.isFinite(total) ? total : filas.length;
    }
    const fechas = filas.map((f: any) => this.fechaClave(f)).filter(Boolean).sort();
    if (fechas.length) this.ultimaFechaPagina.set(page, fechas[0]);
    return filas;
  }

  private async cargarReporteAsync(): Promise<void> {
    const filtroFecha = this.filtrosFechaConsulta();
    try {
      if (this.page === 1) {
        this.ultimaFechaPagina.clear();
        this.notasCreditoFiltro = this.incluyeNotasCredito()
          ? await firstValueFrom(
              this.notaCreditoService.listarParaReporte607(this.filtrosNotasCredito(filtroFecha)),
            )
          : [];
      }

      let facturasPagina: any[] = [];
      if (this.incluyeFacturas()) {
        facturasPagina = await this.consultarPaginaFacturas(this.page, filtroFecha);
        // Limite superior de la pagina: la fecha mas antigua de la anterior.
        if (this.page > 1 && !this.ultimaFechaPagina.has(this.page - 1)) {
          await this.consultarPaginaFacturas(this.page - 1, filtroFecha);
        }
      } else {
        this.totalFacturasFiltro = 0;
      }

      const paginasFact = this.totalFacturasFiltro > 0
        ? Math.ceil(this.totalFacturasFiltro / this.pageSize)
        : 0;

      let filas: any[];
      if (paginasFact > 0) {
        const superior = this.page > 1 ? this.ultimaFechaPagina.get(this.page - 1) || null : null;
        const inferior = this.page < paginasFact ? this.ultimaFechaPagina.get(this.page) || null : null;
        const notasPagina = this.notasCreditoFiltro.filter((nota) => {
          const fecha = this.fechaClave(nota);
          return (!inferior || fecha >= inferior) && (!superior || fecha < superior);
        });
        filas = [...facturasPagina, ...notasPagina];
        this.totalPages = paginasFact;
      } else {
        // Sin facturas (o filtro E34): solo notas, paginadas aqui.
        filas = this.notasCreditoFiltro.slice(
          (this.page - 1) * this.pageSize,
          this.page * this.pageSize,
        );
        this.totalPages = Math.max(1, Math.ceil(this.notasCreditoFiltro.length / this.pageSize));
      }

      this.facturas = filas;
      this.total = this.totalFacturasFiltro + this.notasCreditoFiltro.length;
      this.totalPages = Math.max(1, this.totalPages);
      this.loading = false;
    } catch (error: any) {
      console.error('[Reporte607Component] Error cargando Rep. 607', error);
      this.loading = false;
      const detalle = String(error?.message || error?.details || '').trim();
      Swal.fire('Error', detalle || 'No se pudo cargar el Rep. 607', 'error');
    }
  }

  aplicarFiltros(): void {
    this.page = 1;
    this.totalFacturasFiltro = 0;
    this.notasCreditoFiltro = [];
    this.consultaRealizada = true;
    this.cargarReporte();
  }

  limpiarFiltros(): void {
    this.fecha = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.tipoComprobante = '';
    this.estadoDgii = '';
    this.numeroFactura = '';
    this.encf = '';
    this.empresaFiltro = this.esUsuarioRoot() ? '' : this.empresaUsuarioActual();
    this.sucursalFiltro = '';
    this.modoFecha = 'rango';
    this.page = 1;
    this.facturas = [];
    this.total = 0;
    this.totalPages = 1;
    this.consultaRealizada = false;
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
        await Swal.fire('Sin información', 'No hay facturas para exportar con los filtros seleccionados.', 'info');
        return;
      }
      const html = this.construirHtmlXls(rows);
      const blob = new Blob([`\ufeff${html}`], {
        type: 'application/vnd.ms-excel;charset=utf-8',
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

  puedeEditarEncf(factura: any): boolean {
    if (factura?.esNotaCredito) return false;
    return this.estadoTexto(factura).toLowerCase().includes('rechaz');
  }

  async abrirModalEliminarEncf(factura: any): Promise<void> {
    if (!this.puedeEditarEncf(factura) || this.facturaEditando) return;
    const codigo = String(factura?.fa_codFact || factura?.fa_codfact || '').trim();
    const encf = String(factura?.fa_ncfFact || factura?.fa_ncffact || '').trim();
    const empresa = this.empresaUsuarioActual();
    if (!codigo) return;

    const confirmacion = await Swal.fire({
      title: 'Editar factura rechazada',
      html: `
        <div class="text-start">
          <p class="mb-2">Se eliminara el e-NCF de esta factura:</p>
          <div class="border rounded p-3 bg-light">
            <div><strong>Factura:</strong> ${this.escapeHtml(codigo)}</div>
            <div><strong>e-NCF actual:</strong> ${this.escapeHtml(encf || 'Sin e-NCF')}</div>
            <div><strong>Estado:</strong> ${this.escapeHtml(this.estadoTexto(factura))}</div>
          </div>
          <p class="text-danger mt-3 mb-0">Esta accion deja vacio el campo fa_ncffact.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar e-NCF',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
      reverseButtons: true,
    });
    if (!confirmacion.isConfirmed) return;

    this.facturaEditando = codigo;
    try {
      const response = await firstValueFrom(
        this.servicioFacturacion.eliminarEncfFacturaRechazada(codigo, { empresa }),
      );
      factura.fa_ncfFact = '';
      factura.fa_ncffact = null;
      if (response?.data) Object.assign(factura, response.data);
      await Swal.fire('Actualizado', `Se elimino el e-NCF de la factura ${codigo}.`, 'success');
    } catch (error: any) {
      console.error('[Reporte607Component] Error eliminando e-NCF', error);
      await Swal.fire('Error', String(error?.message || 'No se pudo eliminar el e-NCF.'), 'error');
    } finally {
      this.facturaEditando = '';
    }
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
    void Swal.fire({
      title: 'Reenviando...',
      text: 'Preparando factura para DGII...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });
    try {
      await this.facturaDgiiService.reenviar(factura, (text) => {
        const popup = Swal.getPopup();
        const popupActivo = !!popup &&
          popup.isConnected &&
          !popup.classList.contains('swal2-hide');
        if (popupActivo) {
          Swal.update({ title: 'Reenviando...', text });
        }
      });
      Swal.close();
      await Swal.fire('Agregada a la cola', `La factura ${codigo} quedó pendiente para envío automático a DGII.`, 'success');
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

  fechaComprobante(factura: any): any {
    return factura?.fa_fecncf ??
      factura?.fa_fecNcf ??
      null;
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
    // Las notas de credito se reenvian desde Contabilidad > Nota de credito.
    if (factura?.esNotaCredito) return false;
    const estado = this.estadoTexto(factura).toLowerCase();
    return estado.includes('rechaz') ||
      estado.includes('error') ||
      estado.includes('success') ||
      estado.includes('aceptado condicional');
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
    // Cada fecha se consulta por separado para evitar que PostgreSQL tenga que
    // filtrar y ordenar todo el mes dentro de una sola sentencia.
    // La funcion permite lotes grandes. Usar 10 registros provocaba cientos
    // de solicitudes y daba la impresion de que la exportacion se quedaba
    // bloqueada sin generar el archivo.
    const pageSize = 500;
    const rows: any[] = [];
    const fechas = this.fechasExportacion();
    const fechasAConsultar = !this.incluyeFacturas() ? [] : fechas.length ? fechas : [''];

    for (const fechaConsulta of fechasAConsultar) {
      for (let page = 1; ; page += 1) {
        const response = await firstValueFrom(this.servicioFacturacion.buscarReporte607Dgii({
          page,
          pageSize,
          fecha: fechaConsulta,
          fechaDesde: fechaConsulta ? '' : this.fechaDesde,
          fechaHasta: fechaConsulta ? '' : this.fechaHasta,
          tipoComprobante: this.tipoComprobante,
          estadoDgii: this.estadoDgii,
          numeroFactura: this.numeroFactura,
          encf: this.encf,
          empresa: this.empresaFiltro,
          sucursal: this.sucursalFiltro,
          exportacion: true,
        }));

        const pageRows = Array.isArray(response?.data) ? response.data : [];
        rows.push(...pageRows);

        const pagination = response?.pagination || {};
        const totalPages = Math.max(1, Number(pagination.totalPages || 1));
        if (pageRows.length < pageSize || page >= totalPages) break;
        // Proteccion adicional ante un conteo incorrecto devuelto por una
        // version anterior de la RPC.
        if (page >= 1000) {
          throw new Error('La exportación no pudo completar la paginación del reporte.');
        }
      }
    }

    if (this.incluyeNotasCredito()) {
      const notas = await firstValueFrom(
        this.notaCreditoService.listarParaReporte607(
          this.filtrosNotasCredito(this.filtrosFechaConsulta()),
        ),
      );
      rows.push(...notas);
    }

    const unicas = new Map<string, any>();
    rows.forEach((factura: any, index: number) => {
      const codigo = String(factura?.fa_codFact ?? factura?.fa_codfact ?? '').trim();
      const empresa = String(factura?.fa_codEmpr ?? factura?.fa_codempr ?? '').trim();
      const sucursal = String(factura?.fa_codSucu ?? factura?.fa_codsucu ?? '').trim();
      const tipo = factura?.esNotaCredito ? 'NC' : 'FA';
      unicas.set(`${tipo}|${empresa}|${sucursal}|${codigo || index}`, factura);
    });
    // Facturas y notas de credito juntas, de la fecha mas reciente a la mas antigua.
    return Array.from(unicas.values()).sort((a: any, b: any) =>
      this.fechaClave(b).localeCompare(this.fechaClave(a)) ||
      String(b?.fa_ncfFact ?? b?.fa_ncffact ?? '').localeCompare(
        String(a?.fa_ncfFact ?? a?.fa_ncffact ?? ''),
      ),
    );
  }

  private fechasExportacion(): string[] {
    const fechaUnica = String(this.fecha || '').trim();
    if (fechaUnica) return [fechaUnica];

    const desde = /^\d{4}-\d{2}-\d{2}$/.test(this.fechaDesde || '')
      ? new Date(`${this.fechaDesde}T00:00:00Z`)
      : null;
    const hasta = /^\d{4}-\d{2}-\d{2}$/.test(this.fechaHasta || '')
      ? new Date(`${this.fechaHasta}T00:00:00Z`)
      : null;
    if (!desde || !hasta || desde > hasta) return [];

    const fechas: string[] = [];
    const cursor = new Date(hasta);
    while (cursor >= desde) {
      fechas.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    return fechas;
  }

  private construirHtmlXls(rows: any[]): string {
    const body = rows.map((factura) => {
      const estado = this.estadoTexto(factura);
      const exportarMontos = !this.esRechazadoOError(estado);
      const itbisRaw = factura.fa_itbiFact ?? factura.fa_itbifact;
      const montoRaw = factura.fa_valFact ?? factura.fa_valfact;
      const itbis = this.numeroXls(itbisRaw);
      const monto = this.numeroXls(montoRaw);
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
          <td class="date">${this.escapeHtml(this.fechaXls(this.fechaComprobante(factura), true))}</td>
          <td class="date">${this.escapeHtml(this.fechaXls(this.fechaRecepcionDgii(factura), false))}</td>
          <td class="text">${this.escapeHtml(this.aprobacionComercial(factura))}</td>
          <td class="date">${this.escapeHtml(this.fechaXls(this.fechaAprobacionComercial(factura), false))}</td>
          <td>${this.escapeHtml(estado)}</td>
          <td class="text">${this.escapeHtml(this.formaPagoTexto(factura))}</td>
          <td class="number">${exportarMontos ? itbis : ''}</td>
          <td class="number">${exportarMontos ? monto : ''}</td>
          ${this.columnasFormaPago607
            .map((columna) => `<td class="number">${
              exportarMontos
                ? this.montoFormaPago(factura, columna.codigo, montoRaw)
                : ''
            }</td>`)
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

  private montoFormaPago(factura: any, codigoColumna: string, montoRaw: any): string {
    const codigoFactura = String(
      factura?.fa_codfpago ?? factura?.fa_codFpago ?? '',
    ).trim();
    return codigoFactura === String(codigoColumna).trim()
      ? this.numeroXls(montoRaw)
      : '';
  }

  private formaPagoTexto(factura: any): string {
    const codigo = String(factura?.fa_codfpago ?? factura?.fa_codFpago ?? '').trim();
    const formaCatalogo = this.formasPago.find(
      (forma) => String(forma?.fp_codfpago ?? '').trim() === codigo,
    );
    const descripcion = String(
      formaCatalogo?.fp_descfpago ??
        factura?.fp_descfpago ??
        factura?.formaPagoDescripcion ??
        factura?.forma_pago ??
        factura?.formaPago ??
        '',
    ).trim();
    if (descripcion && codigo) return `${codigo} - ${descripcion}`;
    if (descripcion) return descripcion;
    return codigo;
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
