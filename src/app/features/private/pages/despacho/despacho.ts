import { Component, ElementRef, ViewChild } from '@angular/core';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { ModeloDespachadorData } from 'src/app/core/services/mantenimientos/despachadores';
import { ServicioDespachador } from 'src/app/core/services/mantenimientos/despachadores/despachador.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'despacho',
  templateUrl: './despacho.html',
  styleUrls: ['./despacho.css'],
})
export class DespachoComponent {
  @ViewChild('cedulaInput') cedulaInput!: ElementRef<HTMLInputElement>;
  @ViewChild('facturaInput') facturaInputRef!: ElementRef<HTMLInputElement>;

  cedula = '';
  despacho: ModeloDespachadorData | null = null;
  mensaje = '';
  facturaNumero = '';
  clienteNombre = '';
  facturaData: any = null;

  constructor(
    private despachoService: ServicioDespachador,
    private serviciofacturacion: ServicioFacturacion
  ) {}

  buscarDespachador() {
    const cedula = this.cedula.trim();
    if (!cedula) {
      this.mensaje = 'Debe ingresar una cedula';
      return;
    }

    this.despachoService.buscarPorCedula(cedula).subscribe({
      next: (response) => {
        const despachador = response?.data || null;
        if (!despachador) {
          this.despacho = null;
          this.mensaje = 'No se encontro un despachador con esa cedula';
          return;
        }

        this.despacho = despachador;
        this.mensaje = '';
        this.facturaInputRef?.nativeElement.focus();
      },
      error: (error) => {
        this.despacho = null;
        this.mensaje = error?.message || 'No se pudo consultar el despachador';
      },
    });
  }

  buscarFactura() {
    const numeroFactura = this.facturaNumero.trim();
    if (!this.despacho) {
      this.mensaje = 'Primero debe buscar un despachador valido';
      this.cedulaInput?.nativeElement.focus();
      return;
    }

    if (!numeroFactura) {
      this.mensaje = 'Debe ingresar un numero de factura';
      return;
    }

    this.serviciofacturacion.getByNumero(numeroFactura).subscribe({
      next: (response) => {
        const factura = response?.data || (response?.fa_codFact ? response : null);
        const codigoFactura = String(factura?.fa_codFact || '').trim();
        if (!factura || !codigoFactura) {
          this.facturaData = null;
          this.mensaje = 'No se encontro una factura con ese numero';
          return;
        }

        if (String(factura.fa_impresa || '').trim().toUpperCase() === 'N') {
          this.facturaData = null;
          this.mensaje = 'La factura no ha sido impresa';
          this.cedulaInput?.nativeElement.focus();
          return;
        }

        this.cargarDetalleEImprimir(factura, codigoFactura);
      },
      error: (error) => {
        this.facturaData = null;
        this.mensaje = error?.message || 'No se pudo consultar la factura';
      },
    });
  }

  limpiarCampos() {
    this.cedula = '';
    this.despacho = null;
    this.facturaNumero = '';
    this.facturaData = null;
    this.mensaje = 'Campos reiniciados';
    this.clienteNombre = '';
    setTimeout(() => this.cedulaInput?.nativeElement.focus(), 0);
  }

  imprimirConduce() {
    if (!this.facturaData) {
      this.mensaje = 'Debe buscar una factura primero';
      return;
    }

    const f = this.facturaData;
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: [72, 297],
    });
    const formatoMoneda = new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2,
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;
    const nombreEmpresa = localStorage.getItem('nombre_empresa') || 'Mi Empresa';
    const logoEmpresa = localStorage.getItem('logo_empresa') || 'assets/logo.jpg';
    let y = 5;

    try {
      const formatoLogo = this.obtenerFormatoLogo(logoEmpresa);
      doc.addImage(logoEmpresa, formatoLogo, centerX - 9, y, 18, 18);
      y += 21;
    } catch {
      y += 3;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(nombreEmpresa, centerX, y, { align: 'center', maxWidth: pageWidth - 6 });
    y += 6;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('CONDUCE DE DESPACHO', centerX, y, { align: 'center' });
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Factura No: ${f.fa_codFact}`, 2, y);
    y += 5;
    doc.text(`Fecha: ${f.fa_fecFact || ''}`, 2, y);
    y += 5;
    doc.text(`Cliente: ${f.fa_nomClie || ''}`, 2, y);
    y += 5;
    doc.text(`RNC: ${f.fa_rncFact || 'N/A'}`, 2, y);
    y += 5;
    doc.text(`Direccion: ${f.fa_dirClie || ''}`, 2, y);
    y += 5;
    doc.text(`Telefono: ${f.fa_telClie || ''}`, 2, y);
    y += 5;
    doc.text(`Despachador: ${this.despacho?.nomDesp || ''}`, 2, y);
    y += 5;
    doc.text(`Cedula: ${this.despacho?.cedDesp || ''}`, 2, y);
    y += 3;

    const tableColumn = ['Cant.', 'Precio', 'Itbis', 'Total', ''];
    const tableRows: any[] = [];
    (f.detalles || []).forEach((item: any) => {
      tableRows.push([
        { content: item.df_canMerc, styles: { halign: 'right' } },
        { content: item.df_preMerc, styles: { halign: 'right' } },
        { content: item.df_itbiMerc || '0.00', styles: { halign: 'right' } },
        { content: item.df_valMerc, styles: { halign: 'right' } },
        '',
      ]);
      tableRows.push([
        {
          content: `${item.df_desMerc} (${item.df_codMerc})`,
          colSpan: 5,
          styles: { halign: 'left', fontStyle: 'italic' },
        },
      ]);
    });

    autoTable(doc, {
      startY: y,
      head: [tableColumn],
      body: tableRows,
      theme: 'plain',
      headStyles: {
        fontSize: 7,
        textColor: 0,
        fontStyle: 'bold',
        fillColor: false,
        lineColor: [0, 0, 0],
        lineWidth: { top: 0.3, right: 0, bottom: 0.3, left: 0 },
      },
      bodyStyles: {
        fontSize: 7,
        lineWidth: 0,
        cellPadding: { top: 0.5, bottom: 0.5 },
      },
      margin: { left: 2 },
      columnStyles: {
        0: { cellWidth: 12, halign: 'left' },
        1: { cellWidth: 12, halign: 'right' },
        2: { cellWidth: 15, halign: 'right' },
        3: { cellWidth: 15, halign: 'right' },
        4: { cellWidth: 10, halign: 'right' },
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 70;
    doc.setFontSize(7);
    doc.text('Subtotal:', 5, finalY + 7);
    doc.text(formatoMoneda.format(Number(f.fa_subFact)), 17, finalY + 7);
    doc.text('ITBIS:', 5, finalY + 10);
    doc.text(formatoMoneda.format(Number(f.fa_itbiFact)), 17, finalY + 10);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Total:', 5, finalY + 13);
    doc.text(formatoMoneda.format(Number(f.fa_valFact)), 17, finalY + 13);
    doc.setFont('helvetica', 'normal');
    doc.text('Recibido Conforme', pageWidth / 2, 290, { align: 'center' });

    doc.autoPrint();
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      this.mensaje = 'El navegador bloqueo la ventana de impresion';
      return;
    }

    this.registrarImpresionDespacho(f.fa_codFact);
    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch {}
    }, 600);
  }

  private cargarDetalleEImprimir(factura: any, codigoFactura: string) {
    this.serviciofacturacion.buscarMercanciaPorFactura(codigoFactura).subscribe({
      next: (response) => {
        const detalles = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : Array.isArray(factura?.detalles)
              ? factura.detalles
              : [];

        this.facturaData = { ...factura, detalles };
        this.clienteNombre = factura.fa_nomClie || '';
        this.mensaje = '';
        this.imprimirConduce();
      },
      error: (error) => {
        this.facturaData = { ...factura, detalles: factura?.detalles || [] };
        this.mensaje = error?.message || 'No se pudo consultar el detalle de la factura';
      },
    });
  }

  private obtenerFormatoLogo(logo: string): string {
    const source = String(logo || '').toLowerCase();
    if (source.startsWith('data:image/jpeg') || source.startsWith('data:image/jpg')) {
      return 'JPEG';
    }
    if (source.startsWith('data:image/webp') || source.endsWith('.webp')) {
      return 'WEBP';
    }
    if (source.startsWith('data:image/png') || source.endsWith('.png')) {
      return 'PNG';
    }
    return 'JPEG';
  }

  private registrarImpresionDespacho(codigoFactura: string) {
    const tipoDespachador = String(this.despacho?.tipoDesp || '').trim().toUpperCase();
    if (!codigoFactura || (tipoDespachador !== 'H' && tipoDespachador !== 'F')) {
      return;
    }

    this.serviciofacturacion.registrarImpresionDespacho(codigoFactura, tipoDespachador).subscribe({
      next: (response: any) => {
        if (response?.data) {
          this.facturaData = {
            ...this.facturaData,
            fa_impalmaf: response.data.fa_impalmaf ?? this.facturaData?.fa_impalmaf,
            fa_impalmap: response.data.fa_impalmap ?? this.facturaData?.fa_impalmap,
          };
        }
      },
      error: (error) => {
        this.mensaje = error?.message || 'El conduce se imprimio, pero no se marco la factura';
      },
    });
  }
}
