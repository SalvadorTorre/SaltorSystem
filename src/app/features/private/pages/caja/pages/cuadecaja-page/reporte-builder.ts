import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export class ReporteCierreBuilder {
  private doc: jsPDF;
  private yPos: number = 20;

  constructor() {
    this.doc = new jsPDF();
  }

  public iniciarDocumento(titulo: string): ReporteCierreBuilder {
    this.doc.setFontSize(18);
    this.doc.text(titulo, 14, this.yPos);
    this.yPos += 10;
    this.doc.setFontSize(12);
    this.doc.text(`Fecha de Impresión: ${new Date().toLocaleString()}`, 14, this.yPos);
    this.yPos += 10;
    return this;
  }

  public agregarDatosGenerales(rango: string, usuario?: string): ReporteCierreBuilder {
    this.doc.setFontSize(10);
    this.doc.text(`Rango de Fechas: ${rango}`, 14, this.yPos);
    this.yPos += 6;
    if (usuario) {
      this.doc.text(`Cajero: ${usuario}`, 14, this.yPos);
      this.yPos += 6;
    }
    this.yPos += 5;
    return this;
  }

  public agregarTotales(totales: any, formatoMoneda: (val: number) => string): ReporteCierreBuilder {
    this.doc.setFontSize(14);
    this.doc.text('Resumen de Valores Cobrados', 14, this.yPos);
    this.yPos += 10;

    this.doc.setFontSize(12);
    const startX = 20;
    const lineHeight = 8;

    this.doc.text(`Efectivo:`, startX, this.yPos);
    this.doc.text(`${formatoMoneda(totales.efectivo)}`, startX + 40, this.yPos, { align: 'right' });
    this.yPos += lineHeight;

    this.doc.text(`Tarjeta:`, startX, this.yPos);
    this.doc.text(`${formatoMoneda(totales.tarjeta)}`, startX + 40, this.yPos, { align: 'right' });
    this.yPos += lineHeight;

    this.doc.text(`Depósito:`, startX, this.yPos);
    this.doc.text(`${formatoMoneda(totales.deposito)}`, startX + 40, this.yPos, { align: 'right' });
    this.yPos += lineHeight;

    this.doc.text(`Cheque:`, startX, this.yPos);
    this.doc.text(`${formatoMoneda(totales.cheque)}`, startX + 40, this.yPos, { align: 'right' });
    this.yPos += lineHeight + 2;

    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`TOTAL GENERAL:`, 14, this.yPos);
    this.doc.text(`${formatoMoneda(totales.total)}`, 60, this.yPos, { align: 'right' });
    this.doc.setFont('helvetica', 'normal');
    this.yPos += 15;
    return this;
  }

  public agregarTablaDetalle(facturas: any[], formatoMoneda: (val: number) => string): ReporteCierreBuilder {
    const data = facturas.map(f => [
      f.fa_codFact,
      new Date(f.fa_fecha).toLocaleString(),
      f.fa_nomClie,
      f.fa_fpago,
      formatoMoneda(Number(f.fa_total))
    ]);

    autoTable(this.doc, {
      startY: this.yPos,
      head: [['Factura', 'Fecha', 'Cliente', 'Forma Pago', 'Total']],
      body: data,
      theme: 'grid',
      headStyles: { fillColor: [66, 66, 66] },
    });

    this.yPos = (this.doc as any).lastAutoTable.finalY + 10;
    return this;
  }

  public agregarFirma(): ReporteCierreBuilder {
    if (this.yPos > 250) {
      this.doc.addPage();
      this.yPos = 40;
    } else {
      this.yPos += 30;
    }

    this.doc.line(14, this.yPos, 80, this.yPos);
    this.doc.text('Firma Cajero', 14, this.yPos + 5);

    this.doc.line(110, this.yPos, 180, this.yPos);
    this.doc.text('Firma Supervisor', 110, this.yPos + 5);

    return this;
  }

  public build(nombreArchivo: string = 'reporte_cierre.pdf'): void {
    this.doc.save(nombreArchivo);
  }
}