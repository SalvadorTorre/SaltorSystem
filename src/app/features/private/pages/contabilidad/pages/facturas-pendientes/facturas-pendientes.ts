import { Component, OnInit } from '@angular/core';
import { FacturaDgiiService } from 'src/app/core/services/facturacion/factura/factura-dgii.service';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
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

  constructor(
    private servicioFacturacion: ServicioFacturacion,
    private facturaDgiiService: FacturaDgiiService,
  ) {}

  ngOnInit(): void {
    this.cargarFacturas();
  }

  cargarFacturas(): void {
    this.loading = true;
    this.servicioFacturacion.buscarFacturasPendientesDgii().subscribe({
      next: (response: any) => {
        this.allFacturas = (response.data || [])
          .filter((factura: any) =>
            !this.esStatusU(factura) &&
            (this.faltaNcf(factura) || this.esRechazadaDgii(factura))
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

  private esStatusU(factura: any): boolean {
    return this.normalizarBandera(factura?.fa_status ?? factura?.faStatus) === 'U';
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

  esPendiente(factura: any): boolean {
    return ['S', 'P'].includes(this.normalizarBandera(factura?.fa_pendiente));
  }

  esCobrada(factura: any): boolean {
    return ['S', 'P'].includes(this.normalizarBandera(factura?.fa_fpago));
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
}
