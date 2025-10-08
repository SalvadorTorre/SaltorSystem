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

  buscarDespachador() {
    if (this.cedula.trim() === '') {
      alert('Debe ingresar una cédula');
      return;
    }
    console.log('Buscando despachador con cédula:', this.cedula);

    this.despachoService.buscarPorCedula(this.cedula).subscribe((response)=>{
      console.log(response);
       if (response) {
          this.despacho = response.data[0];
          this.mensaje = '';
        } else {
          this.despacho = null;
          this.mensaje = 'No se encontró un despachador con esa cédula';
        }
    });
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
      } else {
        this.facturaData = null;
        this.mensaje = 'No se encontró una factura con ese número';
      }
    });
  }
// generarPDF() {
//   if (!this.facturaData) {
//     alert("Debe buscar una factura primero");
//     return;
//   }
//   const f = this.facturaData;
// const doc = new jsPDF({
//   orientation: 'p',
//   unit: 'mm',
//   format: [72, 297]  // ancho 72mm, alto ajustable (297mm = A4, pero puedes reducirlo)
// });
// // Formateador para pesos dominicanos (DOP)
// const formatoMoneda = new Intl.NumberFormat('es-DO', {
//   style: 'currency',
//   currency: 'RD$',
//   minimumFractionDigits: 2
// });
// const pageWidth = doc.internal.pageSize.getWidth();
//   // const f = this.facturaData;
//   // const doc = new jsPDF('p', 'mm', 'a4');
//   // const pageWidth = doc.internal.pageSize.getWidth();

//   // --- Encabezado ---
//   doc.setFontSize(12);
//   doc.setTextColor(0, 0, 0);
//   doc.text('FACTURA', pageWidth / 2, 10, { align: 'center' });

//   doc.setFontSize(8);
//   doc.setTextColor(0, 0, 0);
//   doc.text(`Factura No: ${f.fa_codFact}`, 2, 20);
//   doc.text(`Fecha: ${f.fa_fecFact}`, 2, 25);
//   doc.text(`Cliente: ${f.fa_nomClie}`, 2, 30);
//   doc.text(`RNC: ${f.fa_rncFact || 'N/A'}`, 2, 35);
//   doc.text(`Dirección: ${f.fa_dirClie}`, 2, 40);
//   doc.text(`Teléfono: ${f.fa_telClie}`,2, 45);
//   doc.text(`Vendedor: ${f.fa_nomVend}`,2, 50);

//   // --- Tabla de productos ---
//   //const tableColumn = ['Cód', 'Desc', 'Cant', 'Precio', 'Total'];
//   // const tableColumn = ['Cant', 'Precio', 'Total', ''];
//   // const tableRows: any[] = [];

//   // f.detalles.forEach((item: any) => {
//   //   tableRows.push([
//   //     item.df_codMerc,
//   //     item.df_desMerc,
//   //     item.df_canMerc,
//   //     item.df_preMerc,
//   //     item.df_valMerc
//   //   ]);
//   // });
// //************************** */
//   const tableColumn = ['Cant.', 'Precio', 'Itbis', 'Total', ''];
//   const tableRows: any[] = [];

// f.detalles.forEach((item: any) => {
//   // 1️⃣ Primera fila → cantidad, precio, total
//   tableRows.push([
//     { content: item.df_canMerc, styles: { halign: 'right' } },
//     { content: item.df_preMerc, styles: { halign: 'right' } },
//     { content: item.df_valMerc, styles: { halign: 'right' } },
//     '' // vacío para cuadrar colSpan
//   ]);
//     tableRows.push([
//     {
//       content: `${item.df_desMerc} (${item.df_codMerc}) `,
//       colSpan: 4, // 👈 ocupa todo el ancho de la tabla
//       styles: { halign: 'rigt' }
//     }
//   ]);
// });
// //******************* */
//   // Generar tabla (NO retorna nada)
//   autoTable(doc, {
//     startY: 52,
//     head: [tableColumn],
//     body: tableRows,
//     theme: 'grid',
    
//     headStyles: {
//      fontSize: 7,
//      textColor: 0, 
//      fontStyle: 'bold', 
//      fillColor: false, 
//      lineWidth: { top: 0.3, right: 0, bottom: 0.3, left: 0 }, // 👈 solo línea abajo
//      lineColor: [0, 0, 0]
//     },

//     bodyStyles:
//     { 
//       fontSize: 7,
//       lineWidth: 0,   // 👈 sin borde en el cuerpo
//       cellPadding: { top: 0.5, bottom: 0.5 }  // 👈 menos espacio arriba y abajo
//     },
//     margin: { left: 2 },

// //     didDrawCell: (data: any) => {
// //     // 👉 Línea arriba (debajo del header)
// //     if (data.row.section === 'head' && data.column.index === 0) {
// //       doc.setDrawColor(0);
// //       doc.setLineWidth(0.3);
// //       doc.line(
// //         data.table.startX,
// //         data.cell.y + data.cell.height,       // parte de abajo del header
// //         data.table.startX + data.table.width,
// //         data.cell.y + data.cell.height
// //       );
// //     }
// //  // 👉 Línea abajo (después del último row del body)
// //     if (data.row.section === 'body' 
// //         && data.row.index === data.table.body.length - 1  // última fila
// //         && data.column.index === 0) {
// //       doc.setDrawColor(0);
// //       doc.setLineWidth(0.3);
// //       doc.line(
// //         data.table.startX,
// //         data.cell.y + data.cell.height,       // parte de abajo del último item
// //         data.table.startX + data.table.width,
// //         data.cell.y + data.cell.height
// //       );
// //     }
// //   },


//   columnStyles: {
//       0: { cellWidth: 12, halign: 'left' },
//       1: { cellWidth: 12, halign: 'right' },
//       2: { cellWidth: 15, halign: 'right' },
//       3: { cellWidth: 15, halign: 'right' },
//    },
//     // columnStyles: {
//     //   0: { cellWidth: 12 },
//     //   1: { cellWidth: 20 },
//     //   2: { cellWidth: 10, halign: 'right' },
//     //   3: { cellWidth: 12, halign: 'right' },
//     //   4: { cellWidth: 15, halign: 'right' },
//     // },
//   });

//   // Obtener la posición final de la tabla desde el doc
//   const finalY = (doc as any).lastAutoTable.finalY || 70;

//   // --- Totales ---
//   doc.setFontSize(7);
//   doc.text(`Subtotal: ${formatoMoneda.format(f.fa_subFact)}`, 5, finalY + 10);
//   doc.text(`ITBIS: ${f.fa_itbiFact}`, 5, finalY + 15);

//   doc.setFontSize(7);
//   doc.setFont('helvetica', 'bold');
//   doc.text(`Total: ${f.fa_valFact}`, 5, finalY + 20);
//   doc.setFont('helvetica', 'normal');

//   // --- Pie de página ---
//   const pageCount = doc.getNumberOfPages();
//   for (let i = 1; i <= pageCount; i++) {
//     doc.setPage(i);
//     doc.setFontSize(10);
//     doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, 290, { align: 'center' });
//   }

//   // --- Guardar PDF ---
//   doc.save(`Factura_${f.fa_codFact}.pdf`);
// }
// generarPDF() {
//   if (!this.facturaData) {
//     alert("Debe buscar una factura primero");
//     return;
//   }

//   const f = this.facturaData;
//   const doc = new jsPDF('p', 'mm', 'a4');
//   const pageWidth = doc.internal.pageSize.getWidth();

//   // --- Encabezado ---
//   doc.setFontSize(18);
//   doc.setTextColor(41, 128, 185);
//   doc.text('FACTURA', pageWidth / 2, 20, { align: 'center' });

//   doc.setFontSize(12);
//   doc.setTextColor(0, 0, 0);
//   doc.text(`Factura No: ${f.fa_codFact}`, 14, 30);
//   doc.text(`Fecha: ${f.fa_fecFact}`, 14, 37);
//   doc.text(`Cliente: ${f.fa_nomClie}`, 14, 44);
//   doc.text(`RNC: ${f.fa_rncFact || 'N/A'}`, 14, 51);
//   doc.text(`Dirección: ${f.fa_dirClie}`, 14, 58);
//   doc.text(`Teléfono: ${f.fa_telClie}`, 14, 65);
//   doc.text(`Vendedor: ${f.fa_nomVend}`, 14, 72);

//   // --- Tabla de productos ---
//   const tableColumn = ['Código', 'Descripción', 'Cantidad', 'Precio', 'Total'];
//   const tableRows: any[] = [];

//   f.detalles.forEach((item: any) => {
//     tableRows.push([
//       item.df_codMerc,
//       item.df_desMerc,
//       item.df_canMerc,
//       item.df_preMerc,
//       item.df_valMerc
//     ]);
//   });

//   // Generar tabla (NO retorna nada)
//   autoTable(doc, {
//     startY: 80,
//     head: [tableColumn],
//     body: tableRows,
//     theme: 'grid',
//     headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
//     bodyStyles: { fontSize: 11 },
//     showHead: 'everyPage'
//   });

//   // Obtener la posición final de la tabla desde el doc
//   const finalY = (doc as any).lastAutoTable.finalY || 100;

//   // --- Totales ---
//   doc.setFontSize(12);
//   doc.text(`Subtotal: ${f.fa_subFact}`, 150, finalY + 10);
//   doc.text(`ITBIS: ${f.fa_itbiFact}`, 150, finalY + 16);

//   doc.setFontSize(14);
//   doc.setFont('helvetica', 'bold');
//   doc.text(`Total: ${f.fa_valFact}`, 150, finalY + 24);
//   doc.setFont('helvetica', 'normal');

//   // --- Pie de página ---
//   const pageCount = doc.getNumberOfPages();
//   for (let i = 1; i <= pageCount; i++) {
//     doc.setPage(i);
//     doc.setFontSize(10);
//     doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, 290, { align: 'center' });
//   }

//   // --- Guardar PDF ---
//   doc.save(`Factura_${f.fa_codFact}.pdf`);
// }





}

