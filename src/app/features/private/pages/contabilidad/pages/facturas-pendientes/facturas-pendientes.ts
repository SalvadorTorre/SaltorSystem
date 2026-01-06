import { Component, OnInit } from '@angular/core';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-facturas-pendientes',
  templateUrl: './facturas-pendientes.html',
  styleUrls: ['./facturas-pendientes.css'],
})
export class FacturasPendientesComponent implements OnInit {
  facturas: any[] = [];
  page = 1;
  pageSize = 10;
  total = 0;
  loading = false;

  constructor(private servicioFacturacion: ServicioFacturacion) {}

  ngOnInit(): void {
    this.cargarFacturas();
  }

  allFacturas: any[] = []; // Store all invoices for client-side pagination

  cargarFacturas() {
    this.loading = true;
    this.servicioFacturacion.buscarFacturasPendientesDgii().subscribe({
      next: (response: any) => {
        console.log('Facturas Pendientes Response:', response);
        this.allFacturas = response.data || [];
        this.total = this.allFacturas.length;
        this.updatePaginatedFacturas();
        this.loading = false;
      },
      error: (error) => {
        console.error(error);
        this.loading = false;
        Swal.fire(
          'Error',
          'No se pudieron cargar las facturas pendientes',
          'error'
        );
      },
    });
  }

  updatePaginatedFacturas() {
    const startIndex = (this.page - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.facturas = this.allFacturas.slice(startIndex, endIndex);
  }

  cambiarPagina(newPage: number) {
    this.page = newPage;
    this.updatePaginatedFacturas();
  }

  enviar(factura: any) {
    // TODO: Implementar lógica de envío real
    Swal.fire('Info', 'Funcionalidad de envío en desarrollo', 'info');
  }

  verXml(factura: any) {
    const xmlContent =
      factura.xmls?.ecf ||
      factura.xmls?.rfce ||
      factura.xmls?.ECF ||
      factura.xmls?.RFCE ||
      'No hay XML disponible';

    // Función simple para escapar caracteres HTML
    const escapeHtml = (unsafe: string) => {
      return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const escapedXml = escapeHtml(xmlContent);

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
        // Lógica para copiar al portapapeles
        navigator.clipboard.writeText(xmlContent).then(
          () => {
            Swal.showValidationMessage('¡Copiado al portapapeles!');
            setTimeout(() => Swal.resetValidationMessage(), 1500);
          },
          (err) => {
            console.error('Error al copiar: ', err);
            Swal.showValidationMessage('Error al copiar');
          }
        );
        return false; // Prevenir cierre automático al copiar
      },
    });
  }

  get totalPages(): number {
    return Math.ceil(this.total / this.pageSize);
  }

  get pages(): number[] {
    const p = [];
    for (let i = 1; i <= this.totalPages; i++) {
      p.push(i);
    }
    return p;
  }
}
