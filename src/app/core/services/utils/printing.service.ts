import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';

@Injectable({
  providedIn: 'root',
})
export class PrintingService {
  constructor() {}

  /**
   * Generates a PDF for a receipt/invoice in 80mm format and prints it.
   * @param facturaData The invoice header data.
   * @param items The list of items in the invoice.
   */
  imprimirFactura80mm(facturaData: any, items: any[]) {
    console.log('JsBarcode loaded:', !!JsBarcode);
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: [80, 297], // 80mm width, dynamic height would be better but fixed is okay for thermal
    });

    const pageWidth = 74; // Adjusted to safer printable area width
    const centerX = pageWidth / 2;
    const leftMargin = 5; // 5mm margin
    const rightMargin = 5; // 5mm margin
    let yPos = 5;

    // Helper for dashed lines
    const drawDashedLine = (y: number) => {
      (doc as any).setLineDash([1, 1], 0);
      doc.line(leftMargin, y, pageWidth - rightMargin, y);
      (doc as any).setLineDash([], 0); // Reset
    };

    // Helper for centering text
    const centerText = (text: string, y: number, options?: any) => {
      doc.text(text, centerX, y, { align: 'center', ...options });
    };

    // --- 1. LOGO ---
    try {
      const imgData = 'assets/logo2.png';
      const imgWidth = 20;
      const imgHeight = 20;
      doc.addImage(
        imgData,
        'PNG',
        centerX - imgWidth / 2,
        yPos,
        imgWidth,
        imgHeight
      );
      yPos += imgHeight + 5;
    } catch (e) {
      console.warn('Logo no cargado', e);
      yPos += 5;
    }

    // --- HEADER ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    // centerText('*** COPIA DE DOCUMENTO FISCAL ***', yPos);
    yPos += 5;

    // --- 2. COMPANY INFO ---
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    let empresa = 'CENTRO HIERRO MARCOS SRL';
    let direccion = 'CALLE 30 DE MARZO NO. 54';
    let telefono = '809-547-0022';
    let rncEmpresa = '101-66762-2';

    try {
      const empresaStorage = localStorage.getItem('empresa');
      console.log('Raw empresaStorage:', empresaStorage);

      if (empresaStorage && empresaStorage !== '[object Object]') {
        let parsedEmpresa = JSON.parse(empresaStorage);
        console.log('Parsed empresa:', parsedEmpresa);

        // Handle array response if necessary
        if (Array.isArray(parsedEmpresa)) {
          parsedEmpresa = parsedEmpresa[0];
        }

        if (parsedEmpresa) {
          if (typeof parsedEmpresa === 'string') {
            // Case where empresa is stored just as the name string
            empresa = parsedEmpresa;
            // Try to recover other details from legacy keys or defaults
            direccion = localStorage.getItem('direccion_empresa') || direccion;
            telefono = localStorage.getItem('telefono_empresa') || telefono;
            rncEmpresa = localStorage.getItem('rnc_empresa') || rncEmpresa;
          } else {
            // Case where empresa is an object
            empresa = parsedEmpresa.nom_empre || empresa;
            direccion = parsedEmpresa.dir_empre || direccion;
            telefono = parsedEmpresa.tel_empre || telefono;
            rncEmpresa = parsedEmpresa.rnc_empre || rncEmpresa;
          }
        }
      } else if (empresaStorage === '[object Object]') {
        console.warn(
          'DATOS DE EMPRESA CORRUPTOS EN LOCALSTORAGE. POR FAVOR CERRAR SESION Y ENTRAR DE NUEVO.'
        );
      }
    } catch (e) {
      console.warn('Error recuperando datos de empresa', e);
      // Fallback on error is already handled by initial values
    }

    centerText(empresa, yPos);
    yPos += 4;

    const dirSplit = doc.splitTextToSize(
      direccion,
      pageWidth - (leftMargin + rightMargin)
    );
    centerText(dirSplit, yPos);
    yPos += dirSplit.length * 4;

    centerText(`Tel: ${telefono}`, yPos);
    yPos += 4;
    centerText(`RNC: ${rncEmpresa}`, yPos);
    yPos += 6;

    drawDashedLine(yPos);
    yPos += 5;

    // --- 3. FACTURA DETAILS ---
    // Handle data structure variations
    const f = facturaData.data || facturaData;
    const ncf = f.fa_ncfFact || f.ncf || '';
    const fecha = f.fa_fecFact ? new Date(f.fa_fecFact) : new Date();
    const cliente = f.fa_nomClie || 'CLIENTE GENERICO';
    const rncCliente = f.fa_rncFact || '';
    const codFact = f.fa_codFact || '';
    const vendedor = f.fa_nomVend || f.fa_codVend || '';

    // Title logic
    let tituloFactura = 'FACTURA PARA CONSUMIDOR FINAL';
    if (String(ncf).startsWith('B01') || String(ncf).startsWith('E31')) {
      tituloFactura = 'FACTURA DE CRÉDITO FISCAL';
    }

    doc.setFont('helvetica', 'bold');
    centerText(tituloFactura, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    doc.text(`NCF: ${ncf}`, leftMargin, yPos);
    yPos += 4;

    // Format Date Helper
    const formatDate = (date: Date) => {
      const d = new Date(date);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    };

    doc.text(`Fecha: ${formatDate(fecha)}`, leftMargin, yPos);
    yPos += 4;
    doc.text(`Factura: ${codFact}`, leftMargin, yPos);
    yPos += 4;

    drawDashedLine(yPos);
    yPos += 5;

    doc.text(`Cliente: ${cliente}`, leftMargin, yPos);
    yPos += 4;
    if (rncCliente && rncCliente !== 'N/A') {
      doc.text(`RNC/Cédula: ${rncCliente}`, leftMargin, yPos);
      yPos += 4;
    }
    if (vendedor) {
      doc.text(`Vendedor: ${vendedor}`, leftMargin, yPos);
      yPos += 4;
    }

    drawDashedLine(yPos);
    yPos += 5;

    // --- 4. ITEMS TABLE ---
    doc.setFont('helvetica', 'bold');
    const xDesc = leftMargin;
    const xCant = 38;
    const xItbis = 52;
    const xValor = pageWidth - rightMargin;

    doc.text('DESC', xDesc, yPos);
    doc.text('CANT', xCant, yPos, { align: 'right' });
    doc.text('ITBIS', xItbis, yPos, { align: 'right' });
    doc.text('VALOR', xValor, yPos, { align: 'right' });
    yPos += 2;
    drawDashedLine(yPos);
    yPos += 4;

    doc.setFont('helvetica', 'normal');

    const formatoMoneda = new Intl.NumberFormat('es-DO', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    items.forEach((item: any) => {
      const desc = item.producto?.in_desmerc || item.df_desMerc || '';
      const cant = item.cantidad || item.df_canMerc || 0;
      const totalItem = item.total || item.df_valMerc || 0;
      const itbisItem = item.df_itbiMerc || totalItem * 0.18 || 0;

      // Split description
      const descLines = doc.splitTextToSize(desc, 30); // Narrower width for desc
      doc.text(descLines, xDesc, yPos);

      // Align numbers with first line of description
      doc.text(String(cant), xCant, yPos, { align: 'right' });
      doc.text(formatoMoneda.format(itbisItem), xItbis, yPos, {
        align: 'right',
      });
      doc.text(formatoMoneda.format(totalItem), xValor, yPos, {
        align: 'right',
      });

      yPos += Math.max(descLines.length * 4, 4) + 2;
    });

    drawDashedLine(yPos);
    yPos += 5;

    // --- 5. TOTALS ---
    const subTotal = f.fa_subFact || 0;
    const totalItbis = f.fa_itbiFact || 0;
    const totalGral = f.fa_valFact || 0;

    const labelX = 35;
    const valueX = pageWidth - rightMargin;

    doc.text('Subtotal', labelX, yPos, { align: 'right' });
    doc.text(formatoMoneda.format(subTotal), valueX, yPos, { align: 'right' });
    yPos += 4;

    doc.text('ITBIS', labelX, yPos, { align: 'right' });
    doc.text(formatoMoneda.format(totalItbis), valueX, yPos, {
      align: 'right',
    });
    yPos += 4;

    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', labelX, yPos, { align: 'right' });
    doc.text(formatoMoneda.format(totalGral), valueX, yPos, { align: 'right' });
    yPos += 4;

    drawDashedLine(yPos);
    yPos += 5;

    // --- 6. FOOTER ---
    doc.setFont('helvetica', 'normal');
    doc.text(`Artículos: ${items.length}`, leftMargin, yPos);
    yPos += 4;
    centerText('*** GRACIAS POR SU COMPRA ***', yPos);
    yPos += 8; // Extra space before barcode

    // --- 7. BARCODE ---
    if (codFact) {
      try {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, codFact, {
          format: 'CODE128',
          width: 2,
          height: 40,
          displayValue: true,
          fontSize: 10,
          margin: 0,
        });
        const barcodeData = canvas.toDataURL('image/png');
        // Center barcode
        // Assuming barcode width roughly fits. Adjust width/height in addImage.
        // 40mm width for barcode
        doc.addImage(barcodeData, 'PNG', centerX - 25, yPos, 50, 15);
        yPos += 20;
      } catch (e) {
        console.error('Error generating barcode', e);
      }
    }

    // Espacio adicional al final para el corte de papel
    yPos += 15;
    doc.text('.', leftMargin, yPos, { align: 'left' }); // Un punto casi invisible para forzar el largo

    // --- PRINT ---
    doc.autoPrint();
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);

    this.printPdf(pdfUrl);
  }

  private printPdf(pdfUrl: string) {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        setTimeout(() => iframe.contentWindow?.print(), 500);
      } catch (e) {
        console.error('Print error', e);
      } finally {
        // Clean up after a delay
        setTimeout(() => {
          document.body.removeChild(iframe);
          try {
            URL.revokeObjectURL(pdfUrl);
          } catch {}
        }, 2000);
      }
    };
    iframe.src = pdfUrl;
  }
}
