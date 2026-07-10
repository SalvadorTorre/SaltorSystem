import { Component, OnInit } from '@angular/core';
import { FacturaDgiiService } from 'src/app/core/services/facturacion/factura/factura-dgii.service';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { ServicioEmpresa } from 'src/app/core/services/mantenimientos/empresas/empresas.service';
import { ServicioSucursal } from 'src/app/core/services/mantenimientos/sucursal/sucursal.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-facturas-pendientes',
  templateUrl: './facturas-pendientes.html',
  styleUrls: ['./facturas-pendientes.css'],
})
export class FacturasPendientesComponent implements OnInit {
  facturas: any[] = [];
  allFacturas: any[] = [];
  page = 1;
  pageSize = 10;
  total = 0;
  loading = false;
  facturaEnviando = '';
  empresaFiltro = '';
  sucursalFiltro = '';
  fechaDesde = '';
  fechaHasta = '';
  empresas: any[] = [];
  sucursales: any[] = [];

  constructor(
    private servicioFacturacion: ServicioFacturacion,
    private facturaDgiiService: FacturaDgiiService,
    private servicioEmpresa: ServicioEmpresa,
    private servicioSucursal: ServicioSucursal,
  ) {}

  ngOnInit(): void {
    this.cargarCatalogosFiltro();
    this.cargarFacturas();
  }

  private cargarCatalogosFiltro(): void {
    this.servicioEmpresa.buscarTodasEmpresa(1, 500).subscribe({
      next: (response: any) => {
        this.empresas = Array.isArray(response?.data) ? response.data : [];
      },
      error: (error) => console.error('[FacturasPendientes] Error cargando empresas', error),
    });

    this.servicioSucursal.buscarTodasSucursal().subscribe({
      next: (response: any) => {
        this.sucursales = Array.isArray(response?.data) ? response.data : [];
      },
      error: (error) => console.error('[FacturasPendientes] Error cargando sucursales', error),
    });
  }

  cargarFacturas(): void {
    this.loading = true;
    this.servicioFacturacion.buscarFacturasPendientesDgii({
      empresa: this.empresaFiltro,
      sucursal: this.sucursalFiltro,
      fechaDesde: this.fechaDesde,
      fechaHasta: this.fechaHasta,
    }).subscribe({
      next: (response: any) => {
        this.allFacturas = (response.data || [])
          .filter((factura: any) =>
            !this.esStatusExcluido(factura) &&
            (this.faltaNcf(factura) || this.esRechazadaDgii(factura)) &&
            this.cumpleFiltrosLocales(factura)
          )
          .sort(
          (a: any, b: any) =>
            this.numeroFactura(b?.fa_codFact ?? b?.fa_codfact) -
              this.numeroFactura(a?.fa_codFact ?? a?.fa_codfact) ||
            String(b?.fa_codFact ?? b?.fa_codfact ?? '').localeCompare(
              String(a?.fa_codFact ?? a?.fa_codfact ?? ''),
            ),
          );
        this.total = this.allFacturas.length;
        if (this.page > this.totalPages && this.totalPages > 0) {
          this.page = this.totalPages;
        }
        this.updatePaginatedFacturas();
        this.loading = false;
      },
      error: (error) => {
        console.error(error);
        this.loading = false;
        Swal.fire(
          'Error',
          'No se pudieron cargar las facturas pendientes',
          'error',
        );
      },
    });
  }

  aplicarFiltros(): void {
    this.page = 1;
    this.cargarFacturas();
  }

  limpiarFiltros(): void {
    this.empresaFiltro = '';
    this.sucursalFiltro = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.page = 1;
    this.cargarFacturas();
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

  updatePaginatedFacturas(): void {
    const startIndex = (this.page - 1) * this.pageSize;
    this.facturas = this.allFacturas.slice(
      startIndex,
      startIndex + this.pageSize,
    );
  }

  cambiarPagina(newPage: number): void {
    if (newPage < 1 || newPage > this.totalPages) return;
    this.page = newPage;
    this.updatePaginatedFacturas();
  }

  normalizarBandera(value: any): string {
    return String(value ?? '').trim().toUpperCase();
  }

  private faltaNcf(factura: any): boolean {
    const ncf = String(
      factura?.fa_ncfFact ?? factura?.fa_ncffact ?? '',
    ).trim();
    return !ncf || ['NULL', 'UNDEFINED'].includes(ncf.toUpperCase());
  }

  private esStatusExcluido(factura: any): boolean {
    return ['U', 'N'].includes(this.normalizarBandera(factura?.fa_status ?? factura?.faStatus));
  }

  esRechazadaDgii(factura: any): boolean {
    return this.normalizarTexto(factura?.estado_dgii).includes('RECHAZADO');
  }

  estadoDgiiTexto(factura: any): string {
    if (this.esRechazadaDgii(factura)) return 'Rechazado';
    return String(factura?.estado_dgii || factura?.estado_envio_dgii || '').trim() || '-';
  }

  private normalizarTexto(value: any): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();
  }

  irPrimeraPagina(): void {
    this.cambiarPagina(1);
  }

  irUltimaPagina(): void {
    this.cambiarPagina(this.totalPages);
  }

  private numeroFactura(value: any): number {
    const digitos = String(value ?? '').match(/\d+/g)?.join('') || '0';
    return Number(digitos);
  }

  private normalizarFecha(value: any): string {
    const text = String(value || '').trim();
    if (!text) return '';
    const dateOnly = text.split('T')[0].split(' ')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly;
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return '';
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatFecha(value: any): string {
    const fecha = this.normalizarFecha(value);
    if (!fecha) return 'N/A';
    const [year, month, day] = fecha.split('-');
    return `${day}/${month}/${year}`;
  }

  private cumpleFiltrosLocales(factura: any): boolean {
    const empresaFactura = String(factura?.fa_codEmpr ?? factura?.fa_codempr ?? '').trim().toUpperCase();
    const sucursalFactura = Number(factura?.fa_codSucu ?? factura?.fa_codsucu ?? 0) || 0;
    const fechaFactura = this.normalizarFecha(factura?.fa_fecFact ?? factura?.fa_fecfact);
    const empresa = String(this.empresaFiltro || '').trim().toUpperCase();
    const sucursal = Number(this.sucursalFiltro || 0) || 0;

    if (empresa && empresaFactura !== empresa) return false;
    if (sucursal && sucursalFactura !== sucursal) return false;
    if (this.fechaDesde && (!fechaFactura || fechaFactura < this.fechaDesde)) return false;
    if (this.fechaHasta && (!fechaFactura || fechaFactura > this.fechaHasta)) return false;
    return true;
  }

  nombreEmpresa(codigo: any): string {
    const cod = String(codigo || '').trim().toUpperCase();
    const empresa = this.empresas.find(
      (item) => String(item.cod_empre || '').trim().toUpperCase() === cod,
    );
    return String(empresa?.nom_empre || cod || 'Todas').trim();
  }

  nombreSucursal(codigo: any): string {
    const cod = Number(codigo || 0) || 0;
    const sucursal = this.sucursales.find(
      (item) => Number(item.cod_sucursal || 0) === cod,
    );
    return String(sucursal?.nom_sucursal || (cod ? String(cod) : 'Todas')).trim();
  }

  esPendiente(factura: any): boolean {
    return ['S', 'P'].includes(this.normalizarBandera(factura?.fa_pendiente));
  }

  esCobrada(factura: any): boolean {
    return ['S', 'P'].includes(this.normalizarBandera(factura?.fa_fpago));
  }

  exportarPdf(): void {
    if (!this.allFacturas.length) {
      Swal.fire('Sin datos', 'No hay facturas para generar el PDF.', 'info');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const empresa = this.empresaFiltro ? this.nombreEmpresa(this.empresaFiltro) : 'Todas';
    const sucursal = this.sucursalFiltro ? this.nombreSucursal(this.sucursalFiltro) : 'Todas';
    const periodo = `${this.fechaDesde ? this.formatFecha(this.fechaDesde) : 'Inicio'} - ${this.fechaHasta ? this.formatFecha(this.fechaHasta) : 'Hoy'}`;
    const totalGeneral = this.allFacturas.reduce(
      (acc, factura) => acc + Number(factura?.fa_valFact ?? factura?.fa_valfact ?? 0),
      0,
    );

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Facturas pendientes DGII', 14, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Generado: ${new Date().toLocaleString('es-DO')}`, pageWidth - 14, 12, { align: 'right' });
    doc.text(`Empresa: ${empresa}    Sucursal: ${sucursal}    Periodo: ${periodo}`, 14, 20);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Registros: ${this.allFacturas.length}`, 14, 36);
    doc.text(`Total: ${this.formatMoney(totalGeneral)}`, pageWidth - 14, 36, { align: 'right' });

    autoTable(doc, {
      startY: 42,
      head: [['Factura', 'Fecha', 'Empresa', 'Sucursal', 'Cliente', 'Tipo', 'Pago', 'Monto', 'Pend.', 'Cobrada', 'DGII']],
      body: this.allFacturas.map((factura) => [
        String(factura?.fa_codFact ?? factura?.fa_codfact ?? ''),
        this.formatFecha(factura?.fa_fecFact ?? factura?.fa_fecfact),
        this.nombreEmpresa(factura?.fa_codEmpr ?? factura?.fa_codempr),
        this.nombreSucursal(factura?.fa_codSucu ?? factura?.fa_codsucu),
        String(factura?.fa_nomClie ?? factura?.fa_nomclie ?? 'Sin cliente'),
        String(factura?.fa_tipoNcf ?? factura?.fa_tiponcf ?? ''),
        String(factura?.fa_codfpago ?? ''),
        this.formatMoney(Number(factura?.fa_valFact ?? factura?.fa_valfact ?? 0)),
        this.esPendiente(factura) ? 'X' : '',
        this.esCobrada(factura) ? 'X' : '',
        this.estadoDgiiTexto(factura),
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [21, 94, 117],
        fontStyle: 'bold',
        fontSize: 7.3,
        textColor: 255,
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [30, 41, 59],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 18 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { cellWidth: 48 },
        5: { cellWidth: 16 },
        6: { cellWidth: 15, halign: 'center' },
        7: { cellWidth: 24, halign: 'right' },
        8: { cellWidth: 14, halign: 'center' },
        9: { cellWidth: 16, halign: 'center' },
        10: { cellWidth: 28 },
      },
      margin: { left: 14, right: 14 },
      didDrawPage: () => {
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(`Pagina ${doc.getNumberOfPages()}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
      },
    });

    doc.save(`facturas-pendientes-${this.fechaDesde || 'inicio'}-${this.fechaHasta || 'hoy'}.pdf`);
  }

  private formatMoney(value: number): string {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  }

  get totalValorFiltrado(): number {
    return this.allFacturas.reduce(
      (acc, factura) => acc + Number(factura?.fa_valFact ?? factura?.fa_valfact ?? 0),
      0,
    );
  }

  async enviar(factura: any): Promise<void> {
    const codigo = String(factura?.fa_codFact || factura?.fa_codfact || '').trim();
    if (!codigo || this.facturaEnviando) return;

    this.facturaEnviando = codigo;
    try {
      await this.facturaDgiiService.procesar(factura, (text) => {
        if (Swal.isVisible()) {
          Swal.update({ text });
          return;
        }
        Swal.fire({
          title: 'Procesando...',
          text,
          allowOutsideClick: false,
          allowEscapeKey: false,
          didOpen: () => Swal.showLoading(),
        });
      });
      Swal.close();
      await Swal.fire(
        'Completado',
        `La factura ${codigo} fue enviada a DGII e impresa.`,
        'success',
      );
      this.cargarFacturas();
    } catch (error: any) {
      console.error('Error enviando factura pendiente a DGII:', error);
      Swal.fire(
        'Error',
        String(
          error?.error?.message ||
            error?.error?.details ||
            error?.message ||
            'No se pudo enviar la factura a DGII.',
        ),
        'error',
      );
    } finally {
      this.facturaEnviando = '';
    }
  }

  verXml(factura: any): void {
    const xmlContent = String(
      factura?.xmls?.ecf ||
        factura?.xmls?.rfce ||
        factura?.xmls?.ECF ||
        factura?.xmls?.RFCE ||
        factura?.ecf ||
        factura?.rfce ||
        'No hay XML disponible',
    );
    const escapedXml = xmlContent
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    Swal.fire({
      title: 'Vista Previa del XML',
      html: `
        <div style="text-align: left; max-height: 400px; overflow-y: auto; background: #f4f4f4; padding: 10px; border-radius: 5px;">
          <pre><code class="language-xml" style="font-size: 12px; font-family: monospace;">${escapedXml}</code></pre>
        </div>
      `,
      width: '800px',
      showCloseButton: true,
      focusConfirm: false,
      confirmButtonText: '<i class="bi bi-clipboard"></i> Copiar',
      confirmButtonAriaLabel: 'Copiar XML',
      showCancelButton: true,
      cancelButtonText: 'Cerrar',
      preConfirm: () => {
        navigator.clipboard.writeText(xmlContent).then(
          () => {
            Swal.showValidationMessage('Copiado al portapapeles');
            setTimeout(() => Swal.resetValidationMessage(), 1500);
          },
          () => Swal.showValidationMessage('Error al copiar'),
        );
        return false;
      },
    });
  }

  get totalPages(): number {
    return Math.ceil(this.total / this.pageSize);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get sucursalesFiltradas(): any[] {
    const empresa = String(this.empresaFiltro || '').trim().toUpperCase();
    if (!empresa) return this.sucursales;
    return this.sucursales.filter(
      (sucursal) => String(sucursal.cod_empre || '').trim().toUpperCase() === empresa,
    );
  }
}
