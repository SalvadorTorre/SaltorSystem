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
    // TODO: Implementar lógica para ver XML real
    Swal.fire('Info', 'Funcionalidad de ver XML en desarrollo', 'info');
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
