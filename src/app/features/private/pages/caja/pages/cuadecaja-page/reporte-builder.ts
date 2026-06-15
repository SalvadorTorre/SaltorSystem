import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export class ReporteCierreBuilder {
  private doc: jsPDF;
  private yPos: number = 20;

  constructor() {
    this.doc = new jsPDF();
  }

  public iniciarDocumento(titulo: string, nombreEmpresa?: string): ReporteCierreBuilder {
    const centroPagina = this.doc.internal.pageSize.getWidth() / 2;
    if (nombreEmpresa) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(16);
      this.doc.text(nombreEmpresa, centroPagina, this.yPos, { align: 'center' });
      this.yPos += 8;
    }

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(14);
    this.doc.text(titulo, centroPagina, this.yPos, { align: 'center' });
    this.doc.setFont('helvetica', 'normal');
    this.yPos += 10;
    this.doc.setFontSize(12);
    this.doc.text(`Fecha de Impresión: ${new Date().toLocaleDateString('es-DO')}`, 14, this.yPos);
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
    this.doc.text(`${formatoMoneda(totales.total)}`, 196, this.yPos, { align: 'right' });
    this.doc.setFont('helvetica', 'normal');
    this.yPos += 15;
    return this;
  }

  public agregarTablaDetalle(facturas: any[], formatoMoneda: (val: number) => string, formatoPago?: (factura: any) => string): ReporteCierreBuilder {
    const data = facturas.map(f => [
      f.fa_codFact,
      this.formatearFecha(f.fa_fecFact),
      f.fa_nomClie,
      formatoMoneda(Number(f.fa_valFact)),
      formatoPago ? formatoPago(f) : f.fa_fpago
    ]);

    autoTable(this.doc, {
      startY: this.yPos,
      head: [['Código Factura', 'Fecha', 'Nombre Cliente', 'Valor Factura', 'Pago']],
      body: data,
      theme: 'grid',
      headStyles: { fillColor: [66, 66, 66] },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'center', cellWidth: 16 }
      }
    });

    this.yPos = (this.doc as any).lastAutoTable.finalY + 10;
    return this;
  }

  public agregarLeyendaFormasPago(formasPago: any[]): ReporteCierreBuilder {
    const formas = (formasPago || [])
      .filter((forma) => forma?.fp_codfpago !== null && forma?.fp_codfpago !== undefined)
      .sort((a, b) => Number(a.fp_codfpago) - Number(b.fp_codfpago));

    if (!formas.length) return this;

    if (this.yPos + 12 + formas.length * 6 > 270) {
      this.doc.addPage();
      this.yPos = 20;
    }

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.text('Leyenda de formas de pago', 14, this.yPos);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.yPos += 6;

    formas.forEach((forma) => {
      this.doc.text(
        `${forma.fp_codfpago} - ${String(forma.fp_descfpago || '').trim()}`,
        14,
        this.yPos,
      );
      this.yPos += 6;
    });

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

  private formatearFecha(value: any): string {
    const texto = String(value || '').trim();
    const fechaIso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (fechaIso) {
      return `${fechaIso[3]}/${fechaIso[2]}/${fechaIso[1]}`;
    }

    const fecha = new Date(value);
    return Number.isNaN(fecha.getTime())
      ? texto
      : fecha.toLocaleDateString('es-DO');
  }
}
