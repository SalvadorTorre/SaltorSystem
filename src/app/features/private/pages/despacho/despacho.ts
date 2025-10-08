import { Despacho } from './../../../../core/services/despacho/despacho.model';
import { Facturacion } from '../facturacion/facturacion';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { Component } from '@angular/core';
import { DespachoService } from './../../../../core/services/despacho/despacho.service';
import { NgForm } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common'; // 👈 aquí está
import { NgModule } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'despacho',
  templateUrl: './despacho.html',
  styleUrls: ['./despacho.css']
})
export class DespachoComponent {
  cedula: string = '';
  despacho:Despacho | any = {};

  //despacho: Despacho | null = null;
  mensaje: string = '';
  factura: string = '';
facturaNumero: string = '';   // valor del input
clienteNombre: string = '';
facturaData: any = null;      // objeto con la factura que devuelve el backend

  constructor(private despachoService: DespachoService, private serviciofacturacion: ServicioFacturacion
  ) { }

  buscarDespachador(facturaInput: HTMLInputElement) {
    if (this.cedula.trim() === '') {
      alert('Debe ingresar una cédula');
      return;
    }

    this.despachoService.buscarPorCedula(this.cedula).subscribe((response)=>{
      console.log(response);
       if (response)
       {
    console.log('Buscando despachador con cédula:', this.cedula);

         this.despacho = response.data[0];
         this.mensaje = '';
       } else {
         this.despacho = null;
         alert('No se encontró un despachador con esa cédula');
    console.log('Buscando:', this.cedula);

         return;
      }
    });
    facturaInput.focus();
  }
  buscarFactura() {
    console.log("Número ingresado:", this.facturaNumero);
    if (!this.facturaNumero || this.facturaNumero.trim() === '') {
      alert('Debe ingresar un número de factura');
      return;
    }
    console.log('Buscando factura con número:', this.facturaNumero);

    this.serviciofacturacion.getByNumero(this.facturaNumero).subscribe((response) => {
      //this.clienteNombre = this.facturaData.fa_nomClie || 'No encontrado';
    console.log('actual: ' + this.facturaNumero);

      console.log("respuesta", response);
      if (response) {
      this.facturaData = response; // 🔹 aquí está la factura completa
      console.log("facturaData", this.facturaData.detalles);
        this.mensaje = '';
        this.generarPDF();
      } else {
        this.facturaData = null;
        this.mensaje = 'No se encontró una factura con ese número';
      }
    });
     
  }
generarPDF() {
  if (!this.facturaData) {
    alert("Debe buscar una factura primero");
    return;
  }
  const f = this.facturaData;
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: [72, 297]  // ancho 72mm, alto ajustable
  });
  
  // Formateador para pesos dominicanos (DOP)
  const formatoMoneda = new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- Encabezado ---
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('FACTURA', pageWidth / 2, 10, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text(`Factura No: ${f.fa_codFact}`, 2, 20);
  doc.text(`Fecha: ${f.fa_fecFact}`, 2, 25);
  doc.text(`Cliente: ${f.fa_nomClie}`, 2, 30);
  doc.text(`RNC: ${f.fa_rncFact || 'N/A'}`, 2, 35);
  doc.text(`Dirección: ${f.fa_dirClie}`, 2, 40);
  doc.text(`Teléfono: ${f.fa_telClie}`, 2, 45);
  doc.text(`Vendedor: ${f.fa_nomVend}`, 2, 50);

  // --- Tabla de productos ---
  const tableColumn = ['Cant.', 'Precio', 'Itbis', 'Total', ''];
  const tableRows: any[] = [];

  f.detalles.forEach((item: any) => {
    // Primera fila → cantidad, precio, total
    tableRows.push([
      { content: item.df_canMerc, styles: { halign: 'right' } },
      { content: item.df_preMerc, styles: { halign: 'right' } },
      { content: item.df_itbiMerc || '0.00', styles: { halign: 'right' } },
      { content: item.df_valMerc, styles: { halign: 'right' } },
      '' // vacío para cuadrar colSpan
    ]);
    
    // Segunda fila → descripción y código
    tableRows.push([
      {
        content: `${item.df_desMerc} (${item.df_codMerc})`,
        colSpan: 5, // ocupa todo el ancho de la tabla
        styles: { halign: 'left', fontStyle: 'italic' }
      }
    ]);
  });

  // Generar tabla con líneas en encabezado, principio y final
  autoTable(doc, {
    startY: 52,
    head: [tableColumn],
    body: tableRows,
    theme: 'plain', // Usamos 'plain' para controlar manualmente las líneas
    
    headStyles: {
      fontSize: 7,
      textColor: 0, 
      fontStyle: 'bold', 
      fillColor: false,
      lineColor: [0, 0, 0],
      lineWidth: { top: 0.3, right: 0, bottom: 0.3, left: 0 }, // 👈 solo línea abajo
    },

    bodyStyles: { 
      fontSize: 7,
      lineWidth: 0, // Sin bordes automáticos
      cellPadding: { top: 0.5, bottom: 0.5 }
    },
    
    margin: { left: 2 },
    
    // Función para dibujar líneas personalizadas
    // didDrawCell: (data: any) => {
    //   // Línea al principio de la tabla (encima del header)
    //   if (data.row.section === 'head' && data.row.index === 0 && data.column.index === 0) {
    //     doc.setDrawColor(0);
    //     doc.setLineWidth(0.3);
    //     doc.line(
    //       data.table.startX,
    //       data.cell.y, // parte superior del header
    //       data.table.startX + data.table.width,
    //       data.cell.y
    //     );
    //   }
      
    //   // Línea debajo del encabezado
    //   if (data.row.section === 'head' && data.column.index === 0) {
    //     doc.setDrawColor(0);
    //     doc.setLineWidth(0.3);
    //     doc.line(
    //       data.table.startX,
    //       data.cell.y + data.cell.height, // parte de abajo del header
    //       data.table.startX + data.table.width,
    //       data.cell.y + data.cell.height
    //     );
    //   }
      
    //   // Línea al final de la tabla (después del último row del body)
    //   if (data.row.section === 'body' 
    //       && data.row.index === data.table.body.length - 1 // última fila
    //       && data.column.index === data.table.body[0].length - 1) { // última columna
    //     doc.setDrawColor(0);
    //     doc.setLineWidth(0.3);
    //     doc.line(
    //       data.table.startX,
    //       data.cell.y + data.cell.height, // parte de abajo del último item
    //       data.table.startX + data.table.width,
    //       data.cell.y + data.cell.height
    //     );
    //   }
    // },

    columnStyles: {
      0: { cellWidth: 12, halign: 'left' },
      1: { cellWidth: 12, halign: 'right' },
      2: { cellWidth: 15, halign: 'right' },
      3: { cellWidth: 15, halign: 'right' },
      4: { cellWidth: 10, halign: 'right' }
    }
  });

  // Obtener la posición final de la tabla desde el doc
  const finalY = (doc as any).lastAutoTable.finalY || 70;

  // --- Totales ---
  doc.setFontSize(7);
  doc.text(`Subtotal:`, 5, finalY + 7);
  doc.text(formatoMoneda.format(Number(f.fa_subFact)), 17, finalY + 7);
  doc.text('ITBIS:', 5, finalY + 10);
  doc.text(formatoMoneda.format(Number(f.fa_itbiFact)), 17, finalY + 10);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', 5, finalY + 13);
  doc.text(formatoMoneda.format(Number(f.fa_valFact)), 17, finalY + 13);
  doc.setFont('helvetica', 'normal');

  // --- Pie de página ---
  doc.text(`Recibido Conforme`, pageWidth / 2, 290, { align: 'center' });
  // const pageCount = doc.getNumberOfPages();
  // for (let i = 1; i <= pageCount; i++) {
  //   doc.setPage(i);
  //   doc.setFontSize(6);
  //   doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, 290, { align: 'center' });
  // }

  // --- Guardar PDF ---
  doc.save(`Factura_${f.fa_codFact}.pdf`);
}





}

