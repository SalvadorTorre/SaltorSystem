import { Component, ElementRef, ViewChild } from '@angular/core';
import * as html2pdf from 'html2pdf.js';

@Component({
  selector: 'app-factura',
  templateUrl: './factura.reporte.html',
})
export class FacturaComponent {
  @ViewChild('facturaRef') facturaElement!: ElementRef;

  // Supón que este es el detalle de la factura (lo puedes cargar desde tu backend o del formulario)
  detalleFactura = [
    { codigo: 'P001', descripcion: 'Producto 1', cantidad: 2, precio: 150, valor: 300 },
    { codigo: 'P002', descripcion: 'Producto 2', cantidad: 1, precio: 500, valor: 500 },
    // ... más items
  ];

  generarFacturaPDF() {
    const opciones = {
      margin: 5,
      filename: 'Factura.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(this.facturaElement.nativeElement).set(opciones).save();
  }
}
