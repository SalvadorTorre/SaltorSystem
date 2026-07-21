import { Component, ElementRef, ViewChild } from '@angular/core';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'despacho',
  templateUrl: './despacho.html',
  styleUrls: ['./despacho.css'],
})
export class DespachoComponent {
  @ViewChild('facturaInput') facturaInputRef!: ElementRef<HTMLInputElement>;

  mensaje = '';
  facturaNumero = '';
  clienteNombre = '';
  facturaData: any = null;

  constructor(
    private serviciofacturacion: ServicioFacturacion
  ) {}

  buscarFactura() {
    const numeroFactura = this.facturaNumero.trim();
    if (!numeroFactura) {
      this.mensaje = 'Debe ingresar un numero de factura';
      this.facturaInputRef?.nativeElement.focus();
      return;
    }

    const tipoDespacho = this.tramoPermitidoPorTipoUsuario();
    if (!tipoDespacho) {
      this.limpiarYEnfocar('El usuario debe tener el rol Hierro o Forjas para imprimir.');
      return;
    }

    this.serviciofacturacion.getByNumero(numeroFactura).subscribe({
      next: (response) => {
        const factura = response?.data || (response?.fa_codFact ? response : null);
        const codigoFactura = String(factura?.fa_codFact || '').trim();
        if (!factura || !codigoFactura) {
          this.limpiarYEnfocar('No se encontro la factura en la sucursal del usuario.');
          return;
        }

        if (this.esMarcaSi(factura.fa_despacho)) {
          this.limpiarYEnfocar('La factura ya fue despachada.');
          return;
        }

        if (String(factura.fa_impresa || '').trim().toUpperCase() === 'N') {
          this.limpiarYEnfocar('La factura no ha sido impresa y no puede despacharse.');
          return;
        }

        const marcaArea = tipoDespacho === 'H'
          ? factura.fa_impalmap
          : factura.fa_impalmaf;
        if (this.esMarcaSi(marcaArea)) {
          this.limpiarYEnfocar(
            tipoDespacho === 'H'
              ? 'La factura ya fue impresa para Hierro.'
              : 'La factura ya fue impresa para Forjas.',
          );
          return;
        }

        this.cargarDetalleEImprimir(factura, codigoFactura);
      },
      error: (error) => {
        this.limpiarYEnfocar(error?.message || 'No se pudo consultar la factura');
      },
    });
  }

  limpiarCampos() {
    this.facturaNumero = '';
    this.facturaData = null;
    this.mensaje = 'Campos reiniciados';
    this.clienteNombre = '';
    setTimeout(() => this.facturaInputRef?.nativeElement.focus(), 0);
  }

  imprimirConduce() {
    if (!this.facturaData) {
      this.mensaje = 'Debe buscar una factura primero';
      return;
    }

    const f = this.facturaData;
    const bloqueo = this.validarFacturaParaImpresion(f);
    if (bloqueo) {
      this.limpiarYEnfocar(bloqueo);
      return;
    }
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
    doc.setFontSize(10);
    doc.text(nombreEmpresa, centerX, y, { align: 'center', maxWidth: pageWidth - 6 });
    y += 6;
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text('FACTURA DE DESPACHO', centerX, y, { align: 'center' });
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Factura No: ${f.fa_codFact}`, 2, y);
    y += 5;
    doc.text(`Fecha: ${f.fa_fecFact || ''}`, 2, y);
    y += 5;
    doc.text(`Cliente: ${f.fa_nomClie || f.fa_nomclie || ''}`, 2, y);
    y += 5;
    doc.text(`RNC: ${this.rncClienteFactura(f) || 'N/A'}`, 2, y);
    y += 5;
    doc.text(`Direccion: ${f.fa_dirClie || ''}`, 2, y);
    y += 5;
    doc.text(`Telefono: ${f.fa_telClie || ''}`, 2, y);
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
        fontSize: 8,
        textColor: 0,
        fontStyle: 'bold',
        fillColor: false,
        lineColor: [0, 0, 0],
        lineWidth: { top: 0.3, right: 0, bottom: 0.3, left: 0 },
      },
      bodyStyles: {
        fontSize: 8,
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
    doc.setFontSize(8);
    doc.text('Subtotal:', 5, finalY + 7);
    doc.text(formatoMoneda.format(Number(f.fa_subFact)), 17, finalY + 7);
    doc.text('ITBIS:', 5, finalY + 10);
    doc.text(formatoMoneda.format(Number(f.fa_itbiFact)), 17, finalY + 10);
    doc.setFontSize(10);
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

    setTimeout(() => {
      try {
        win.focus();
        win.print();
        this.registrarImpresionDespacho(f);
      } catch {
        this.mensaje = 'No se pudo completar la impresion; la factura no fue marcada.';
      }
    }, 600);
  }

  private cargarDetalleEImprimir(factura: any, codigoFactura: string) {
    this.serviciofacturacion.buscarFacturaDetalle(codigoFactura).subscribe({
      next: (response) => {
        const detalles = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : Array.isArray(factura?.detalles)
              ? factura.detalles
              : [];

        const detallesFiltrados = this.filtrarDetallesPorTipoUsuario(detalles);
        if (!detallesFiltrados.length) {
          const tipo = this.tramoPermitidoPorTipoUsuario();
          this.limpiarYEnfocar(
            tipo === 'H'
              ? 'La factura no tiene productos de Hierro (df_tipomerc = H).'
              : 'La factura no tiene productos de Forjas (df_tipomerc = F).',
          );
          return;
        }

        this.facturaData = { ...factura, detalles: detallesFiltrados };
        this.clienteNombre = factura.fa_nomClie || '';
        this.mensaje = '';
        this.imprimirConduce();
      },
      error: (error) => {
        this.limpiarYEnfocar(
          error?.message || 'No se pudo consultar el detalle de la factura',
        );
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

  private rncClienteFactura(factura: any): string {
    return String(
      factura?.fa_rncFact ??
        factura?.fa_rncfact ??
        factura?.fa_rnc ??
        factura?.rncCliente ??
        factura?.rnccliente ??
        factura?.rnc ??
        factura?.clienteRnc ??
        factura?.cl_rnc ??
        ''
    ).trim();
  }

  private registrarImpresionDespacho(factura: any) {
    const codigoFactura = String(factura?.fa_codFact || factura?.fa_codfact || '').trim();
    const tipoDespacho = this.tramoPermitidoPorTipoUsuario();
    if (!codigoFactura || (tipoDespacho !== 'H' && tipoDespacho !== 'F')) {
      this.mensaje = 'El conduce se imprimio, pero no se detecto si el rol es hierro o forjas.';
      return;
    }

    this.serviciofacturacion.registrarImpresionDespacho(codigoFactura, tipoDespacho, {
      sucursal: factura?.fa_codSucu ?? factura?.fa_codsucu,
    }).subscribe({
      next: (response: any) => {
        if (response?.data) {
          this.facturaData = {
            ...this.facturaData,
            fa_impalmaf: response.data.fa_impalmaf ?? this.facturaData?.fa_impalmaf,
            fa_impalmap: response.data.fa_impalmap ?? this.facturaData?.fa_impalmap,
            fa_despacho: response.data.fa_despacho ?? this.facturaData?.fa_despacho,
          };
          this.mensaje = tipoDespacho === 'F'
            ? 'Factura impresa y marcada en forjas.'
            : 'Factura impresa y marcada en hierro.';
        } else {
          this.mensaje = 'El conduce se imprimio, pero no se pudo confirmar la marca en factura.';
        }
      },
      error: (error) => {
        this.mensaje = error?.message || 'El conduce se imprimio, pero no se marco la factura';
      },
    });
  }

  private filtrarDetallesPorTipoUsuario(detalles: any[]): any[] {
    const tramoPermitido = this.tramoPermitidoPorTipoUsuario();
    if (!tramoPermitido) return detalles || [];

    return (detalles || []).filter((item: any) => {
      const tramo = this.normalizarTexto(
        item?.df_tipomerc ??
          item?.df_tipoMerc ??
          item?.fa_tramo ??
          item?.in_tramo ??
          item?.producto?.in_tramo,
      ).toUpperCase();
      return tramo === tramoPermitido;
    });
  }

  private validarFacturaParaImpresion(factura: any): string {
    const tipo = this.tramoPermitidoPorTipoUsuario();
    if (!tipo) return 'El usuario debe tener el rol Hierro o Forjas para imprimir.';
    if (this.esMarcaSi(factura?.fa_despacho)) return 'La factura ya fue despachada.';
    if (String(factura?.fa_impresa || '').trim().toUpperCase() === 'N') {
      return 'La factura no ha sido impresa y no puede despacharse.';
    }
    if (tipo === 'H' && this.esMarcaSi(factura?.fa_impalmap)) {
      return 'La factura ya fue impresa para Hierro.';
    }
    if (tipo === 'F' && this.esMarcaSi(factura?.fa_impalmaf)) {
      return 'La factura ya fue impresa para Forjas.';
    }
    if (!Array.isArray(factura?.detalles) || !factura.detalles.length) {
      return tipo === 'H'
        ? 'La factura no tiene productos de Hierro (df_tipomerc = H).'
        : 'La factura no tiene productos de Forjas (df_tipomerc = F).';
    }
    return '';
  }

  private esMarcaSi(value: any): boolean {
    return String(value ?? '').trim().toUpperCase() === 'S';
  }

  private limpiarYEnfocar(mensaje: string): void {
    this.facturaNumero = '';
    this.facturaData = null;
    this.clienteNombre = '';
    this.mensaje = mensaje;
    setTimeout(() => this.facturaInputRef?.nativeElement.focus(), 0);
  }

  private tramoPermitidoPorTipoUsuario(): 'F' | 'H' | null {
    const storedUserText = this.textoUsuarioGuardado();
    const tipoUsuarioText = this.normalizarTexto([
      localStorage.getItem('roleDescription'),
      localStorage.getItem('tipoUsuario'),
      localStorage.getItem('tipousuario'),
      localStorage.getItem('descripcionTipoUsuario'),
      localStorage.getItem('role'),
      localStorage.getItem('dashboardRole'),
      localStorage.getItem('username'),
      storedUserText,
    ].filter(Boolean).join(' '));

    if (tipoUsuarioText.includes('despacho') && tipoUsuarioText.includes('forja')) return 'F';
    if (tipoUsuarioText.includes('despacho') && tipoUsuarioText.includes('hierro')) return 'H';
    if (tipoUsuarioText.includes('forja')) return 'F';
    if (tipoUsuarioText.includes('hierro')) return 'H';
    return null;
  }

  private textoUsuarioGuardado(): string {
    const keys = ['currentUser', 'usuario', 'user', 'authUser'];
    const values: string[] = [];
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      values.push(raw);
      try {
        const parsed = JSON.parse(raw);
        values.push(
          [
            parsed?.roleDescription,
            parsed?.descripcion,
            parsed?.tipoUsuario,
            parsed?.tipousuario,
            parsed?.role,
            parsed?.rol,
            parsed?.nombreUsuario,
            parsed?.nombreusuario,
          ].filter(Boolean).join(' '),
        );
      } catch {}
    }
    return values.join(' ');
  }

  private normalizarTexto(value: any): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }
}
