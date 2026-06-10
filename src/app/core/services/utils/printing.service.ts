import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import * as QRCode from 'qrcode';
import {
  DesktopPrintProfileKey,
  DesktopPrintSettingsService,
} from './desktop-print-settings.service';

@Injectable({
  providedIn: 'root',
})
export class PrintingService {
  constructor(private desktopPrintSettings: DesktopPrintSettingsService) {}

  private parseInvoiceDateTime(...values: any[]): Date {
    for (const value of values) {
      if (value === null || value === undefined) continue;
      const text = String(value).trim();
      if (!text) continue;

      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        const [year, month, day] = text.split('-').map(Number);
        return new Date(year, (month || 1) - 1, day || 1, 0, 0, 0, 0);
      }

      const normalized = text.includes(' ') && !text.includes('T')
        ? text.replace(' ', 'T')
        : text;
      const parsed = new Date(normalized);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return new Date();
  }

  private facturaEsEnvio(factura: any): boolean {
    const raw = String(
      factura?.fa_envio ??
        factura?.faEnvio ??
        factura?.fentrega ??
        factura?.formaEntrega ??
        ''
    )
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

    return raw === '1' || raw === 'envio';
  }

  private etiquetaPagoConduce(factura: any): string {
    const descripcion = String(
      factura?.descripcionFormaPago ??
        factura?.formaPagoDescripcion ??
        factura?.fp_descfpago ??
        factura?.tipoPago ??
        ''
    ).trim();
    if (descripcion) return descripcion;

    const codigo = String(factura?.fa_codfpago ?? factura?.fa_codFpago ?? '').trim();
    if (codigo === '1') return 'Efectivo';

    const pagado = String(factura?.fa_fpago ?? '').trim().toUpperCase();
    if (pagado === 'S' || pagado === 'P') return codigo ? `Pagada (${codigo})` : 'Pagada';
    if (pagado === 'N') return codigo ? `Pendiente (${codigo})` : 'Pendiente';
    return codigo || pagado || 'No indicado';
  }

  private etiquetaEnvioConduce(factura: any): string {
    const descripcion = String(
      factura?.descripcionFormaEntrega ??
        factura?.formaEntregaDescripcion ??
        factura?.desentrega ??
        factura?.tipoEnvio ??
        ''
    ).trim();
    if (descripcion) return descripcion;

    const codigo = String(factura?.fa_envio ?? factura?.faEnvio ?? '').trim();
    if (codigo === '1') return 'Envio';
    if (codigo === '2') return 'Retiro';
    return codigo || 'No indicado';
  }

  private datosFacturaImpresion(facturaData: any): any {
    const nested =
      facturaData?.data && typeof facturaData.data === 'object'
        ? facturaData.data
        : {};
    return {
      ...nested,
      ...(facturaData || {}),
    };
  }

  private usarTrabajosSeparadosParaCorte(): boolean {
    return typeof window !== 'undefined' && !!window.electronAPI?.isDesktop;
  }

  private esperarEntreTrabajosImpresion(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 900));
  }

  /**
   * Generates a PDF for a receipt/invoice in 80mm format and prints it.
   * @param facturaData The invoice header data.
   * @param items The list of items in the invoice.
   */
  async imprimirFactura80mm(facturaData: any, items: any[]) {
    try {
      console.log('Iniciando impresión de factura...', facturaData);
      console.log('JsBarcode loaded:', !!JsBarcode);
      const facturaRoot = this.datosFacturaImpresion(facturaData);
      const fpago = String(
        facturaRoot?.fa_fpago ?? facturaData?.fa_fpago ?? ''
      )
        .trim()
        .toUpperCase();
      const facturaPagada = fpago === 'S' || fpago === 'P';
      const facturaEnvio = this.facturaEsEnvio(facturaRoot);

      if ((facturaPagada || facturaEnvio) && !facturaData?.__singlePrintCopy) {
        const copias = facturaPagada
          ? facturaEnvio
            ? [
                { label: 'CLIENTE', hideDetails: false },
                { label: 'CONDUCTOR', hideDetails: false },
                { label: 'CAJA', hideDetails: true },
              ]
            : [
                { label: 'CLIENTE', hideDetails: false },
                { label: 'CAJA', hideDetails: true },
              ]
          : [
              { label: 'CONDUCTOR', hideDetails: false },
              { label: 'CAJA', hideDetails: true },
            ];

        if (this.usarTrabajosSeparadosParaCorte()) {
          for (const [index, copia] of copias.entries()) {
            await this.imprimirFactura80mm(
              {
                ...facturaData,
                __singlePrintCopy: true,
                __copyLabel: copia.label,
                __hideInvoiceDetails: copia.hideDetails,
              },
              items,
            );
            if (index < copias.length - 1) {
              await this.esperarEntreTrabajosImpresion();
            }
          }
          return;
        }

        const doc = new jsPDF({
          orientation: 'p',
          unit: 'mm',
          format: [80, 297],
        });

        for (const [index, copia] of copias.entries()) {
          if (index > 0) {
            (doc as any).addPage([80, 297], 'p');
          }
          await this.imprimirFactura80mm(
            {
              ...facturaData,
              __singlePrintCopy: true,
              __copyLabel: copia.label,
              __hideInvoiceDetails: copia.hideDetails,
              __sharedDoc: doc,
              __deferPrint: true,
            },
            items,
          );
        }

        doc.autoPrint();
        const pdfBlob = doc.output('blob');
        await this.printBlob(pdfBlob, 'factura');
        return;
      }

      const copyLabel = String(facturaData?.__copyLabel || '').trim();
      const hideInvoiceDetails = !!facturaData?.__hideInvoiceDetails;
      const doc =
        facturaData?.__sharedDoc ||
        new jsPDF({
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

      if (copyLabel) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(copyLabel, leftMargin, yPos);
      }

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
              direccion =
                localStorage.getItem('direccion_empresa') || direccion;
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
      const f = this.datosFacturaImpresion(facturaData);
      const ncf = f.fa_ncfFact || f.ncf || '';
      const fecha = this.parseInvoiceDateTime(
        f.fa_fehora,
        f.fa_fecHora,
        f.fa_fechora,
        f.fa_fecFact,
      );
      const cliente = f.fa_nomClie || 'CLIENTE GENERICO';
      const rncCliente = f.fa_rncFact || '';
      const codFact = f.barcodeValue || f.fa_codFact || '';
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
      const xCod = leftMargin;
      const xDesc = 17;
      const xCant = pageWidth - rightMargin;
      const xPrecio = 28;
      const xItbis = 49;
      const xValor = pageWidth - rightMargin;

      if (!hideInvoiceDetails) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.text('COD', xCod, yPos);
        doc.text('DESC', xDesc, yPos);
        doc.text('CANT', xCant, yPos, { align: 'right' });
        yPos += 4;
        doc.text('PRECIO', xPrecio, yPos, { align: 'right' });
        doc.text('ITBIS', xItbis, yPos, { align: 'right' });
        doc.text('VALOR', xValor, yPos, { align: 'right' });
        yPos += 2;
        drawDashedLine(yPos);
        yPos += 4;
      }

      doc.setFont('helvetica', 'normal');

      const formatoMoneda = new Intl.NumberFormat('es-DO', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      const itemTotal = (item: any): number => Number(
        item.total ??
          item.df_valMerc ??
          item.df_valmerc ??
          ((Number(item.cantidad ?? item.df_canMerc ?? item.df_canmerc ?? 0) || 0) *
            (Number(item.precio ?? item.df_preMerc ?? item.df_premerc ?? 0) || 0)) ??
          0
      ) || 0;
      const totalDetalle = (items || []).reduce(
        (sum: number, item: any) => sum + itemTotal(item),
        0
      );
      const truncateText = (text: string, maxWidth: number): string => {
        let value = String(text || '').trim();
        while (value && doc.getTextWidth(value) > maxWidth) {
          value = value.slice(0, -1);
        }
        return value;
      };
      const porcentajeMenos = Number(
        f.porcentaje_menos ??
          f.itbis_porcentaje_menos ??
          f.fa_porcentaje_menos ??
          0
      );
      const tasaRestar = porcentajeMenos / 100;
      let subtotalImpresion = 0;
      let itbisImpresion = 0;
      let totalImpresion = 0;

      items.forEach((item: any) => {
        const codigo = item.producto?.in_codmerc || item.df_codMerc || item.df_codmerc || '';
        const desc = item.producto?.in_desmerc || item.df_desMerc || item.df_desmerc || '';
        const cant = item.cantidad || item.df_canMerc || item.df_canmerc || 0;
        const totalItem = itemTotal(item);
        const itbisGuardado = Number(
          item.df_itbiMerc ??
            item.df_itbimerc ??
            item.itbis ??
            item.montoItbis ??
            0
        );
        const precioOriginal = Number(
          item.precio ?? item.df_preMerc ?? item.df_premerc ?? 0
        );
        const totalItbisFactura = Number(f.fa_itbiFact ?? f.fa_itbifact ?? 0);
        const itbisItem = (tasaRestar > 0 ? precioOriginal * tasaRestar * Number(cant || 0) : 0) ||
          itbisGuardado ||
          (totalDetalle > 0 && totalItbisFactura > 0
            ? totalItbisFactura * (totalItem / totalDetalle)
            : 0);
        const precioSinItbis = Number(cant || 0) > 0
          ? (tasaRestar > 0
            ? precioOriginal - (precioOriginal * tasaRestar)
            : (totalItem - itbisItem) / Number(cant || 1))
          : 0;
        const subtotalItem = precioSinItbis * Number(cant || 0);
        subtotalImpresion += subtotalItem;
        itbisImpresion += itbisItem;
        totalImpresion += totalItem;

        if (!hideInvoiceDetails) {
          const codigoCorto = truncateText(codigo, 11);
          const descCorta = truncateText(desc, 37);
          const itemY = yPos;
          doc.text(codigoCorto, xCod, itemY);
          doc.text(descCorta, xDesc, yPos);

          doc.text(formatoMoneda.format(Number(cant || 0)), xCant, yPos, { align: 'right' });
          yPos += 4;
          doc.text(formatoMoneda.format(precioSinItbis), xPrecio, yPos, { align: 'right' });
          doc.text(formatoMoneda.format(itbisItem), xItbis, yPos, {
            align: 'right',
          });
          doc.text(formatoMoneda.format(totalItem), xValor, yPos, {
            align: 'right',
          });

          yPos += 5;
        }
      });

      if (hideInvoiceDetails) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        centerText('COPIA SIN DETALLE DE ARTÍCULOS', yPos);
        yPos += 5;
      }

      drawDashedLine(yPos);
      yPos += 5;
      doc.setFontSize(8);

      // --- 5. TOTALS ---
      const subTotal = subtotalImpresion || f.fa_subFact || 0;
      const totalItbis = itbisImpresion || f.fa_itbiFact || 0;
      const totalGral = totalImpresion || f.fa_valFact || 0;

      const labelX = 35;
      const valueX = pageWidth - rightMargin;

      doc.text('Subtotal', labelX, yPos, { align: 'right' });
      doc.text(formatoMoneda.format(subTotal), valueX, yPos, {
        align: 'right',
      });
      yPos += 4;

      doc.text('ITBIS', labelX, yPos, { align: 'right' });
      doc.text(formatoMoneda.format(totalItbis), valueX, yPos, {
        align: 'right',
      });
      yPos += 4;

      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL', labelX, yPos, { align: 'right' });
      doc.text(formatoMoneda.format(totalGral), valueX, yPos, {
        align: 'right',
      });
      yPos += 4;

      drawDashedLine(yPos);
      yPos += 5;

      // --- DGII INFO & EXTRAS ---
      // Intentar buscar en la raíz o en facturaData.data
      const pickText = (...values: any[]): string | null => {
        for (const value of values) {
          if (value === null || value === undefined) continue;
          const text = String(value).trim();
          if (text) return text;
        }
        return null;
      };

      const responseXML =
        facturaData?.responseXML && typeof facturaData.responseXML === 'object'
          ? facturaData.responseXML
          : f?.responseXML && typeof f.responseXML === 'object'
          ? f.responseXML
          : null;

      const securityCode = pickText(
        facturaData.codseguridad,
        facturaData.codigoSeguridad,
        facturaData.codigoSeguridadeCF,
        facturaData.securityCode,
        responseXML?.codigoSeguridad,
        responseXML?.codigoSeguridadeCF,
        responseXML?.codseguridad,
        f.codseguridad,
        f.codigoSeguridad,
        f.codigoSeguridadeCF,
        f.securityCode,
        f.CodigoSeguridad
      );
      const qrUrl = pickText(
        facturaData.qr_link,
        facturaData.link_original,
        facturaData.qrUrl,
        facturaData.qrLink,
        responseXML?.qrUrl,
        responseXML?.qr_link,
        responseXML?.urlQr,
        responseXML?.link_original,
        f.qr_link,
        f.link_original,
        f.qrUrl,
        f.qrLink,
        f.urlQr
      );
      const signatureDateTime = pickText(
        facturaData.fec_firma,
        facturaData.fechaHoraFirmaRFCE,
        facturaData.signatureDateTime,
        responseXML?.fechaHoraFirma,
        responseXML?.fec_firma,
        f.fec_firma,
        f.fechaHoraFirmaRFCE,
        f.signatureDateTime
      );

      console.log('[PrintingService] DGII print data', {
        codFact,
        qrUrl,
        securityCode,
        signatureDateTime,
      });

      // 1. BARCODE (Primero, antes del QR cuando exista)
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
          // Center barcode 50x15
          doc.addImage(barcodeData, 'PNG', centerX - 25, yPos, 50, 15);
          yPos += 20;
        } catch (e) {
          console.error('Error generating barcode', e);
        }
      }

      // 2. QR CODE (Segundo)
      if (qrUrl) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qrUrl, {
            errorCorrectionLevel: 'M',
          });
          // QR code 25x25mm centered
          doc.addImage(qrDataUrl, 'PNG', centerX - 12.5, yPos, 25, 25);
          yPos += 30;
        } catch (e) {
          console.error('Error generating QR code', e);
        }
      }

      // 3. SECURITY CODE (Tercero)
      if (securityCode) {
        doc.setFont('helvetica', 'bold');
        centerText(`Código Seguridad: ${securityCode}`, yPos);
        yPos += 5;
      }

      // 4. SIGNATURE DATE/TIME (Cuarto)
      if (signatureDateTime) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7); // Slightly smaller
        centerText(`Fecha Firma: ${signatureDateTime}`, yPos);
        doc.setFontSize(10); // Reset font size (though next is footer which sets its own)
        yPos += 5;
      }

      yPos += 5; // Space before footer

      // --- 6. FOOTER ---
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Artículos: ${hideInvoiceDetails ? 0 : (items || []).length}`, leftMargin, yPos);
      yPos += 4;
      centerText('*** GRACIAS POR SU COMPRA ***', yPos);

      // Espacio adicional al final para el corte de papel
      yPos += 25;
      doc.text('.', leftMargin, yPos, { align: 'left' }); // Un punto casi invisible para forzar el largo

      // --- PRINT ---
      if (!facturaData?.__deferPrint) {
        doc.autoPrint();
        const pdfBlob = doc.output('blob');
        await this.printBlob(pdfBlob, 'factura');
      }
    } catch (error) {
      console.error('Error fatal al generar factura:', error);
    }
  }

  /**
   * Generates a PDF for an Entrada de Mercancía in 80mm format and prints it.
   * @param entradaData The entry header data.
   * @param items The list of items in the entry.
   */
  async imprimirEntrada80mm(entradaData: any, items: any[]) {
    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: [80, 297],
      });
      const pageWidth = 74;
      const centerX = pageWidth / 2;
      const leftMargin = 5;
      const rightMargin = 5;
      let yPos = 5;

      const drawDashedLine = (y: number) => {
        (doc as any).setLineDash([1, 1], 0);
        doc.line(leftMargin, y, pageWidth - rightMargin, y);
        (doc as any).setLineDash([], 0);
      };
      const centerText = (text: string, y: number, options?: any) => {
        doc.text(text, centerX, y, { align: 'center', ...options });
      };

      try {
        const imgData = 'assets/logo2.png';
        const imgWidth = 20;
        const imgHeight = 20;
        doc.addImage(imgData, 'PNG', centerX - imgWidth / 2, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 5;
      } catch {}

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      let empresa = 'CENTRO HIERRO MARCOS SRL';
      let direccion = 'CALLE 30 DE MARZO NO. 54';
      let telefono = '809-547-0022';
      let rncEmpresa = '101-66762-2';
      try {
        const empresaStorage = localStorage.getItem('empresa');
        if (empresaStorage && empresaStorage !== '[object Object]') {
          let parsedEmpresa = JSON.parse(empresaStorage);
          if (Array.isArray(parsedEmpresa)) parsedEmpresa = parsedEmpresa[0];
          if (parsedEmpresa) {
            if (typeof parsedEmpresa === 'string') {
              empresa = parsedEmpresa;
              direccion = localStorage.getItem('direccion_empresa') || direccion;
              telefono = localStorage.getItem('telefono_empresa') || telefono;
              rncEmpresa = localStorage.getItem('rnc_empresa') || rncEmpresa;
            } else {
              empresa = parsedEmpresa.nom_empre || empresa;
              direccion = parsedEmpresa.dir_empre || direccion;
              telefono = parsedEmpresa.tel_empre || telefono;
              rncEmpresa = parsedEmpresa.rnc_empre || rncEmpresa;
            }
          }
        }
      } catch {}

      centerText(empresa, yPos);
      yPos += 4;
      const dirSplit = doc.splitTextToSize(direccion, pageWidth - (leftMargin + rightMargin));
      centerText(dirSplit, yPos);
      yPos += dirSplit.length * 4;
      centerText(`Tel: ${telefono}`, yPos);
      yPos += 4;
      centerText(`RNC: ${rncEmpresa}`, yPos);
      yPos += 6;
      drawDashedLine(yPos);
      yPos += 5;

      const e = entradaData;
      const fecha = e.me_fecEntr ? new Date(e.me_fecEntr) : new Date();
      const formatDate = (date: Date) => {
        const d = new Date(date);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
      };

      const formatDateShort = (date: Date) => {
        const d = new Date(date);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      };
      const xLeft = leftMargin;
      const xRight = pageWidth - rightMargin;
      doc.text(`No. Entrada: ${e.me_codEntr || e.me_codentr || ''}`, xLeft, yPos);
      doc.text(`Fecha: ${formatDateShort(fecha)}`, xRight, yPos, { align: 'right' });
      yPos += 4;
      doc.text(`Suplidor: ${(e.me_nomSupl || '').toString()}`, xLeft, yPos);
      yPos += 4;
      const fecSuplTxt = e.me_fecSupl ? formatDateShort(new Date(e.me_fecSupl)) : '';
      doc.text(`Factura No.: ${e.me_facSupl || ''}`, xLeft, yPos);
      doc.text(`Fecha Fact.: ${fecSuplTxt}`, xRight, yPos, { align: 'right' });
      yPos += 4;
      const ordenCompra = (e.me_ordencomp || '').toString();
      if (ordenCompra) {
        doc.text(`Orden Compra: ${ordenCompra}`, xLeft, yPos);
        yPos += 4;
      }
      doc.text(`Vendedor: ${(e.vendedor || '').toString()}`, xLeft, yPos);
      doc.text(`Chofer: ${(e.chofer || '').toString()}`, xRight, yPos, { align: 'right' });
      yPos += 4;
      const usuario = (e.me_nomVend || '').toString();
      doc.text(`Despachador: ${(e.despachado || '').toString()}`, xLeft, yPos);
      doc.text(`Usuario: ${usuario}`, xRight, yPos, { align: 'right' });
      yPos += 6;
      doc.setFont('helvetica', 'bold');
      centerText('ENTRADA DE MERCANCÍAS', yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');

      drawDashedLine(yPos);
      yPos += 5;

      doc.setFont('helvetica', 'bold');
      const xDesc = leftMargin;
      const xCant = 38;
      const xPrecio = 52;
      const xValor = pageWidth - rightMargin;
      doc.text('Cantidad / Descrip', xDesc, yPos);
      doc.text('Cant', xCant, yPos, { align: 'right' });
      doc.text('Precio', xPrecio, yPos, { align: 'right' });
      doc.text('Valor', xValor, yPos, { align: 'right' });
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
        const desc = item.producto?.in_desmerc || item.de_desMerc || '';
        const cant = item.cantidad ?? item.de_canEntr ?? 0;
        const precio = item.precio ?? item.de_preMerc ?? 0;
        const totalItem = item.total ?? item.de_valEntr ?? (cant * precio) ?? 0;
        const descLines = doc.splitTextToSize(desc, 30);
        doc.text(descLines, xDesc, yPos);
        doc.text(String(cant), xCant, yPos, { align: 'right' });
        doc.text(formatoMoneda.format(precio), xPrecio, yPos, { align: 'right' });
        doc.text(formatoMoneda.format(totalItem), xValor, yPos, { align: 'right' });
        yPos += Math.max(descLines.length * 4, 4) + 2;
      });

      drawDashedLine(yPos);
      yPos += 5;
      const totalGral = e.me_valEntr || items.reduce((acc: number, it: any) => {
        const t = it.total ?? it.de_valEntr ?? 0;
        return acc + Number(t);
      }, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL', 35, yPos, { align: 'right' });
      doc.text(formatoMoneda.format(totalGral), pageWidth - rightMargin, yPos, { align: 'right' });
      yPos += 8;
      doc.setFont('helvetica', 'normal');
      doc.text('Nota:', leftMargin, yPos);
      yPos += 4;
      if (e.nota) {
        const notaLines = doc.splitTextToSize(String(e.nota), pageWidth - (leftMargin + rightMargin));
        doc.text(notaLines, leftMargin, yPos);
        yPos += notaLines.length * 4;
      }
      yPos += 6;
      doc.setLineWidth(0.3);
      const lineY = yPos;
      doc.line(leftMargin, lineY, centerX - 4, lineY);
      doc.line(centerX + 4, lineY, pageWidth - rightMargin, lineY);
      doc.setFontSize(7);
      const prep = (e.vendedor || e.me_nomVend || '').toString();
      const recv = (e.despachado || e.chofer || '').toString();
      doc.text(prep ? `Preparado por: ${prep}` : 'Preparado por', (leftMargin + centerX - 4) / 2, lineY + 4, { align: 'center' });
      doc.text(recv ? `Recibido por: ${recv}` : 'Recibido por', (centerX + 4 + pageWidth - rightMargin) / 2, lineY + 4, { align: 'center' });
      yPos += 10;

      centerText('*** ENTRADA REGISTRADA ***', yPos);
      yPos += 15;
      doc.text('.', leftMargin, yPos, { align: 'left' });

      doc.autoPrint();
      const pdfBlob = doc.output('blob');
      await this.printBlob(pdfBlob, 'ticket');
    } catch (error) {
      console.error('Error al generar entrada:', error);
    }
  }
  async imprimirVentainterna80mm(ventaData: any, items: any[]) {
    try {
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [80, 297] });
      const pageWidth = 74;
      const centerX = pageWidth / 2;
      const leftMargin = 5;
      const rightMargin = 5;
      let yPos = 5;
      const drawDashedLine = (y: number) => {
        doc.setLineWidth(0.1);
        for (let x = leftMargin; x < pageWidth - rightMargin; x += 3) {
          doc.line(x, y, x + 1.5, y);
        }
      };
      const centerText = (text: any, y: number, options?: any) => {
        if (Array.isArray(text)) {
          text.forEach((t, i) => doc.text(String(t), centerX, y + i * 4, { align: 'center', ...options }));
          return;
        }
        doc.text(String(text), centerX, y, { align: 'center', ...options });
      };
      try {
        const imgData = 'assets/logo2.png';
        const imgWidth = 20;
        const imgHeight = 20;
        doc.addImage(imgData, 'PNG', centerX - imgWidth / 2, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 5;
      } catch {}
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      let empresa = 'CENTRO HIERRO MARCOS SRL';
      let direccion = 'CALLE 30 DE MARZO NO. 54';
      let telefono = '809-547-0022';
      let rncEmpresa = '101-66762-2';
      try {
        const empresaStorage = localStorage.getItem('empresa');
        if (empresaStorage && empresaStorage !== '[object Object]') {
          let parsedEmpresa = JSON.parse(empresaStorage);
          if (Array.isArray(parsedEmpresa)) parsedEmpresa = parsedEmpresa[0];
          if (parsedEmpresa) {
            if (typeof parsedEmpresa === 'string') {
              empresa = parsedEmpresa;
              direccion = localStorage.getItem('direccion_empresa') || direccion;
              telefono = localStorage.getItem('telefono_empresa') || telefono;
              rncEmpresa = localStorage.getItem('rnc_empresa') || rncEmpresa;
            } else {
              empresa = parsedEmpresa.nom_empre || empresa;
              direccion = parsedEmpresa.dir_empre || direccion;
              telefono = parsedEmpresa.tel_empre || telefono;
              rncEmpresa = parsedEmpresa.rnc_empre || rncEmpresa;
            }
          }
        }
      } catch {}
      centerText(empresa, yPos);
      yPos += 4;
      const dirSplit = doc.splitTextToSize(direccion, pageWidth - (leftMargin + rightMargin));
      centerText(dirSplit, yPos);
      yPos += dirSplit.length * 4;
      centerText(`RNC: ${rncEmpresa}`, yPos);
      yPos += 6;
      drawDashedLine(yPos);
      yPos += 5;
      const v = ventaData || {};
      const fechaTxt = v.fa_fecFact ? new Date(v.fa_fecFact) : new Date();
      const formatDateShort = (date: Date) => {
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yy = String(date.getFullYear()).slice(-2);
        return `${dd}/${mm}/${yy}`;
      };
      const xLeft = leftMargin;
      const xRight = pageWidth - rightMargin;
      doc.text(`No.: ${v.fa_codFact || ''}`, xLeft, yPos);
      doc.text(formatDateShort(fechaTxt), xRight, yPos, { align: 'right' });
      yPos += 4;
      doc.text(String(v.fa_nomClie || ''), xLeft, yPos);
      doc.text(String(v.fa_nomVend || ''), xRight, yPos, { align: 'right' });
      yPos += 4;
      doc.setFont('helvetica', 'bold');
      centerText('PENDIENTE', yPos);
      yPos += 4;
      doc.setFont('helvetica', 'normal');
      drawDashedLine(yPos);
      yPos += 4;
      const formatoMoneda = new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const xDesc = leftMargin;
      const xValor = pageWidth - rightMargin;
      doc.setFont('helvetica', 'bold');
      doc.text('Cantidad / Descripción', xDesc, yPos);
      doc.setFont('helvetica', 'normal');
      yPos += 4;
      drawDashedLine(yPos);
      yPos += 4;
      let totalGral = 0;
      // items.forEach((it: any) => {
      //   const cantidad = Number(it.df_canPend ?? it.cantidad ?? 0);
      //   const des = String(it.df_desMerc ?? it.descripcion ?? '');
      //   const val = Number(it.df_valMerc ?? it.total ?? 0);
      //   const precio = Number(it.df_preMerc ?? it.precio ?? 0);
      //   totalGral += val;
      //   const descLines = doc.splitTextToSize(`${cantidad}  ${des}`, 40);
      //   descLines.forEach((line: string) => {doc.text(line, xDesc, yPos);
      //   yPos += 4;
      // });
      //   // doc.text(`-${cantidad}  ${des}`, xDesc, yPos);
      //   doc.text(formatoMoneda.format(precio), xRight - 20, yPos, { align: 'right' });
      //   doc.text(formatoMoneda.format(val), xValor, yPos, { align: 'right' });
      //   yPos += 5;
      // });
const colCantidad = leftMargin;
const colDesc = leftMargin + 6;
const colPrecio = pageWidth - 22;
const colTotal = pageWidth - rightMargin;

items.forEach((it: any) => {

  const cantidad = Number(it.df_canPend ?? it.cantidad ?? 0);
  const des = String(it.df_desMerc ?? it.descripcion ?? '');
  const precio = Number(it.df_preMerc ?? it.precio ?? 0);
  const val = Number(it.df_valMerc ?? it.total ?? 0);

  totalGral += val;

  // 🔹 dividir descripción en varias líneas
  const descLines = doc.splitTextToSize(des, 34);

  descLines.forEach((line: string, i: number) => {

    // cantidad solo en la primera línea
    if (i === 0) {
      doc.text(String(cantidad), colCantidad, yPos);
    }

    // descripción
    doc.text(line, colDesc, yPos);

    // precio y total solo primera línea
    if (i === 0) {
      doc.text(formatoMoneda.format(precio), colPrecio, yPos, { align: 'right' });
      doc.text(formatoMoneda.format(val), colTotal, yPos, { align: 'right' });
    }

    yPos += 4;

  });

});
      drawDashedLine(yPos);
      yPos += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL', xDesc, yPos);
      doc.text(formatoMoneda.format(totalGral), xValor, yPos, { align: 'right' });
      yPos += 8;
      doc.setFont('helvetica', 'normal');
      doc.text(`Preparado Por: ${String(v.fa_nomVend || '')}`, xDesc, yPos);
      yPos += 10;
      doc.setLineWidth(0.3);
      doc.line(leftMargin, yPos, pageWidth - rightMargin, yPos);
      yPos += 6;
      centerText('Recibido Conforme', yPos);
      yPos += 15;
      doc.text('.', leftMargin, yPos, { align: 'left' });
      doc.autoPrint();
      const pdfBlob = doc.output('blob');
      await this.printBlob(pdfBlob, 'ticket');
    } catch {}
  }

  async imprimirDevolucion80mm(entradaData: any, entradaItems: any[], salidaData: any, salidaItems: any[], extras?: { facturaNumero?: string, cliente?: string, fechaFactura?: any, entradaCodigo?: string, salidaCodigo?: string }) {
    try {
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [80, 297] });
      const pageWidth = 74;
      const centerX = pageWidth / 2;
      const leftMargin = 5;
      const rightMargin = 5;
      let yPos = 5;
      const drawDashedLine = (y: number) => {
        (doc as any).setLineDash([1, 1], 0);
        doc.line(leftMargin, y, pageWidth - rightMargin, y);
        (doc as any).setLineDash([], 0);
      };
      const centerText = (text: any, y: number, options?: any) => {
        doc.text(String(text), centerX, y, { align: 'center', ...options });
      };
      try {
        const imgData = 'assets/logo2.png';
        const imgWidth = 20;
        const imgHeight = 20;
        doc.addImage(imgData, 'PNG', centerX - imgWidth / 2, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 5;
      } catch {}
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      let empresa = 'CENTRO HIERRO MARCOS SRL';
      let direccion = 'CALLE 30 DE MARZO NO. 54';
      let telefono = '809-547-0022';
      let rncEmpresa = '101-66762-2';
      try {
        const empresaStorage = localStorage.getItem('empresa');
        if (empresaStorage && empresaStorage !== '[object Object]') {
          let parsedEmpresa = JSON.parse(empresaStorage);
          if (Array.isArray(parsedEmpresa)) parsedEmpresa = parsedEmpresa[0];
          if (parsedEmpresa) {
            if (typeof parsedEmpresa === 'string') {
              empresa = parsedEmpresa;
              direccion = localStorage.getItem('direccion_empresa') || direccion;
              telefono = localStorage.getItem('telefono_empresa') || telefono;
              rncEmpresa = localStorage.getItem('rnc_empresa') || rncEmpresa;
            } else {
              empresa = parsedEmpresa.nom_empre || empresa;
              direccion = parsedEmpresa.dir_empre || direccion;
              telefono = parsedEmpresa.tel_empre || telefono;
              rncEmpresa = parsedEmpresa.rnc_empre || rncEmpresa;
            }
          }
        }
      } catch {}
      centerText(empresa, yPos);
      yPos += 4;
      const dirSplit = doc.splitTextToSize(direccion, pageWidth - (leftMargin + rightMargin));
      centerText(dirSplit, yPos);
      yPos += dirSplit.length * 4;
      centerText(`Tel: ${telefono}`, yPos);
      yPos += 4;
      centerText(`RNC: ${rncEmpresa}`, yPos);
      yPos += 6;
      drawDashedLine(yPos);
      yPos += 5;
      const formatDateShort = (date: Date) => {
        const d = new Date(date);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      };
      const xLeft = leftMargin;
      const xRight = pageWidth - rightMargin;
      const fechaImpresion = new Date();
      const codEntrada = (extras?.entradaCodigo || entradaData?.me_codEntr || '').toString();
      const codSalida = (extras?.salidaCodigo || salidaData?.fa_codFact || '').toString();
      const facturaNo = extras?.facturaNumero || entradaData?.me_facSupl || '';
      const cliente = extras?.cliente || entradaData?.me_nomSupl || salidaData?.fa_nomClie || '';
      const fechaFacturaTxt = extras?.fechaFactura ? formatDateShort(new Date(extras?.fechaFactura)) : (entradaData?.me_fecSupl ? formatDateShort(new Date(entradaData?.me_fecSupl)) : '');
      doc.text(`Entrada: ${codEntrada}`, xLeft, yPos);
      doc.text(`Salida: ${codSalida}`, xRight, yPos, { align: 'right' });
      yPos += 4;
      doc.text(`Fecha: ${formatDateShort(fechaImpresion)}`, xLeft, yPos);
      yPos += 4;
      doc.text(`Factura: ${facturaNo}`, xLeft, yPos);
      doc.text(`Fecha Fact.: ${fechaFacturaTxt}`, xRight, yPos, { align: 'right' });
      yPos += 4;
      doc.text(`Cliente: ${String(cliente)}`, xLeft, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'bold');
      centerText('ENTRADA DE MERCANCÍAS', yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      drawDashedLine(yPos);
      yPos += 5;
      const formatoMoneda = new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const xDesc = leftMargin;
      const xCant = 38;
      const xPrecio = 52;
      const xValor = pageWidth - rightMargin;
      doc.setFont('helvetica', 'bold');
      doc.text('Cantidad / Descripción', xDesc, yPos);
      doc.text('Cant', xCant, yPos, { align: 'right' });
      doc.text('Precio', xPrecio, yPos, { align: 'right' });
      doc.text('Valor', xValor, yPos, { align: 'right' });
      yPos += 2;
      drawDashedLine(yPos);
      yPos += 4;
      doc.setFont('helvetica', 'normal');
      let totalEntrada = 0;
      (entradaItems || []).forEach((it: any) => {
        const cantidad = Number(it.de_canEntr ?? it.cantidad ?? 0);
        const des = String(it.de_desMerc ?? it.producto?.in_desmerc ?? it.descripcion ?? '');
        const precio = Number(it.de_preMerc ?? it.precio ?? 0);
        const val = Number(it.de_valEntr ?? it.total ?? (cantidad * precio) ?? 0);
        totalEntrada += val;
        const descLines = doc.splitTextToSize(des, 30);
        doc.text(descLines, xDesc, yPos);
        doc.text(String(cantidad), xCant, yPos, { align: 'right' });
        doc.text(formatoMoneda.format(precio), xPrecio, yPos, { align: 'right' });
        doc.text(formatoMoneda.format(val), xValor, yPos, { align: 'right' });
        yPos += Math.max(descLines.length * 4, 4) + 2;
      });
      drawDashedLine(yPos);
      yPos += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL ENTRADA', xDesc, yPos);
      doc.text(formatoMoneda.format(totalEntrada), xValor, yPos, { align: 'right' });
      yPos += 8;
      doc.setFont('helvetica', 'bold');
      centerText('SALIDA (VENTA INTERNA)', yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      drawDashedLine(yPos);
      yPos += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('Cantidad / Descripción', xDesc, yPos);
      doc.text('Cant', xCant, yPos, { align: 'right' });
      doc.text('Precio', xPrecio, yPos, { align: 'right' });
      doc.text('Valor', xValor, yPos, { align: 'right' });
      yPos += 2;
      drawDashedLine(yPos);
      yPos += 4;
      doc.setFont('helvetica', 'normal');
      let totalSalida = 0;
      (salidaItems || []).forEach((it: any) => {
        // const cantidad = Number(it.df_canMerc ?? it.cantidad ?? 0);
        // const des = String(it.df_desMerc ?? it.descripcion ?? '');
        // const precio = Number(it.df_preMerc ?? it.precio ?? 0);
        // const val = Number(it.df_valMerc ?? it.total ?? (cantidad * precio) ?? 0);
        const cantidad = Number(it.cantidad ?? it.df_canMerc ?? 0);
        const des = String(  it.producto?.in_desmerc ?? it.df_desMerc ?? it.descripcion ??'');  
        const precio = Number(it.precio ?? it.df_preMerc ?? 0);
        const val = Number(it.total !== undefined && it.total !== null 
        ? it.total  : it.de_valEntr !== undefined && it.de_valEntr !== null
        ? it.de_valEntr
        : cantidad * precio);
        totalSalida += val;
        const descLines = doc.splitTextToSize(des, 30);
        doc.text(descLines, xDesc, yPos);
        doc.text(String(cantidad), xCant, yPos, { align: 'right' });
        doc.text(formatoMoneda.format(precio), xPrecio, yPos, { align: 'right' });
        doc.text(formatoMoneda.format(val), xValor, yPos, { align: 'right' });
        yPos += Math.max(descLines.length * 4, 4) + 2;
      });
      drawDashedLine(yPos);
      yPos += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL SALIDA', xDesc, yPos);
      doc.text(formatoMoneda.format(totalSalida), xValor, yPos, { align: 'right' });
      yPos += 10;
      doc.setLineWidth(0.3);
      const lineY = yPos;
      doc.line(leftMargin, lineY, centerX - 4, lineY);
      doc.line(centerX + 4, lineY, pageWidth - rightMargin, lineY);
      doc.setFontSize(7);
      const preparado = (entradaData?.me_nomVend || salidaData?.fa_nomVend || '') || '';
      doc.text(preparado ? `Realizado por: ${preparado}` : 'Realizado por', (leftMargin + centerX - 4) / 2, lineY + 4, { align: 'center' });
      doc.text('Despachador', (centerX + 4 + pageWidth - rightMargin) / 2, lineY + 4, { align: 'center' });
      yPos += 15;
      doc.text('.', leftMargin, yPos, { align: 'left' });
      doc.autoPrint();
      const pdfBlob = doc.output('blob');
      await this.printBlob(pdfBlob, 'ticket');
    } catch {}
  }

  async imprimirReciboIngreso80mm(recibo: any, fpagoNombre?: string) {
    try {
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [80, 297] });
      const pageWidth = 74;
      const centerX = pageWidth / 2;
      const leftMargin = 5;
      const rightMargin = 5;
      let yPos = 5;
      const drawDashedLine = (y: number) => {
        (doc as any).setLineDash([1, 1], 0);
        doc.line(leftMargin, y, pageWidth - rightMargin, y);
        (doc as any).setLineDash([], 0);
      };
      const centerText = (text: any, y: number, options?: any) => {
        if (Array.isArray(text)) {
          text.forEach((t, i) => doc.text(String(t), centerX, y + i * 4, { align: 'center', ...options }));
          return;
        }
        doc.text(String(text), centerX, y, { align: 'center', ...options });
      };
      try {
        const imgData = 'assets/logo2.png';
        const imgWidth = 20;
        const imgHeight = 20;
        doc.addImage(imgData, 'PNG', centerX - imgWidth / 2, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 5;
      } catch {}
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      let empresa = 'CENTRO HIERRO MARCOS SRL';
      let direccion = 'CALLE 30 DE MARZO NO. 54';
      let telefono = '809-547-0022';
      let rncEmpresa = '101-66762-2';
      try {
        const empresaStorage = localStorage.getItem('empresa');
        if (empresaStorage && empresaStorage !== '[object Object]') {
          let parsedEmpresa = JSON.parse(empresaStorage);
          if (Array.isArray(parsedEmpresa)) parsedEmpresa = parsedEmpresa[0];
          if (parsedEmpresa) {
            if (typeof parsedEmpresa === 'string') {
              empresa = parsedEmpresa;
              direccion = localStorage.getItem('direccion_empresa') || direccion;
              telefono = localStorage.getItem('telefono_empresa') || telefono;
              rncEmpresa = localStorage.getItem('rnc_empresa') || rncEmpresa;
            } else {
              empresa = parsedEmpresa.nom_empre || empresa;
              direccion = parsedEmpresa.dir_empre || direccion;
              telefono = parsedEmpresa.tel_empre || telefono;
              rncEmpresa = parsedEmpresa.rnc_empre || rncEmpresa;
            }
          }
        }
      } catch {}
      centerText(empresa, yPos);
      yPos += 4;
      const dirSplit = doc.splitTextToSize(direccion, pageWidth - (leftMargin + rightMargin));
      centerText(dirSplit, yPos);
      yPos += dirSplit.length * 4;
      centerText(`Tel: ${telefono}`, yPos);
      yPos += 4;
      centerText(`RNC: ${rncEmpresa}`, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'bold');
      centerText('RECIBO DE INGRESO', yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      drawDashedLine(yPos);
      yPos += 4;
      const r = recibo || {};
      const formatDateShort = (date: Date) => {
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yy = String(date.getFullYear()).slice(-2);
        return `${dd}/${mm}/${yy}`;
      };
      const xLeft = leftMargin;
      const xRight = pageWidth - rightMargin;
      const fechaTxt = r.fecha ? formatDateShort(new Date(r.fecha)) : formatDateShort(new Date());
      doc.text(`No.: ${r.id ?? ''}`, xLeft, yPos);
      doc.text(fechaTxt, xRight, yPos, { align: 'right' });
      yPos += 6;
       doc.setFont('helvetica', 'bold');
      doc.text("Hemos Recibido de:", xLeft, yPos);
       doc.setFont('helvetica', 'normal');
      doc.text(String(r.nombre || ''), leftMargin + 28, yPos);
      yPos += 6;
      //const totalLetras = this.numeroALetras(recibo.cantidad);
      const total = Number(recibo.cantidad);
      const totalLetras = this.numeroALetras(total);
       doc.setFont('helvetica', 'bold');
      doc.text("La suma de:", leftMargin, yPos);
       doc.setFont('helvetica', 'normal');
      yPos += 4;
      const lineas = doc.splitTextToSize(totalLetras, 65);
      lineas.forEach((linea: string) => {
        doc.text(linea, leftMargin, yPos); 
        yPos += 4;
      });
      const formatoMoneda = new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      doc.setFont('helvetica', 'bold');
      doc.text('(', leftMargin, yPos);
      doc.text(formatoMoneda.format(Number(r.cantidad || 0)),leftMargin + 1, yPos);
      doc.text(')', xRight - 10, yPos);
      doc.setFont('helvetica', 'normal');
      yPos += 6;
      if (fpagoNombre || r.fpago !== undefined) {
        doc.setFont('helvetica', 'bold');
        doc.text(`Forma de pago: ${String(fpagoNombre || r.fpago)}`, xLeft, yPos);
        doc.setFont('helvetica', 'normal');
        yPos += 6;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.text('Concepto', xLeft, yPos);
      yPos += 4;
      doc.setFont('helvetica', 'normal');
      const conceptoLines = doc.splitTextToSize(String(r.concepto || ''), pageWidth - (leftMargin + rightMargin));
      doc.text(conceptoLines, xLeft, yPos);
      yPos += Math.max(conceptoLines.length * 4, 4) + 4;
      doc.setLineWidth(0.3);
      const lineY = yPos;
      doc.line(leftMargin, lineY, pageWidth - rightMargin, lineY);
      yPos += 6;
      centerText('Recibido Conforme', yPos);
      yPos += 12;
      doc.text('.', leftMargin, yPos, { align: 'left' });
      doc.autoPrint();
      const pdfBlob = doc.output('blob');
      await this.printBlob(pdfBlob, 'ticket');
    } catch {}
  }

  async imprimirConduceFactura80mm(facturaData: any, items: any[]) {
    try {
      const facturaRoot = this.datosFacturaImpresion(facturaData);
      const fpago = String(
        facturaRoot?.fa_fpago ?? facturaData?.fa_fpago ?? ''
      )
        .trim()
        .toUpperCase();
      const conducePagado = fpago === 'S' || fpago === 'P';
      const conduceEnvio = this.facturaEsEnvio(facturaRoot);

      if ((conducePagado || conduceEnvio) && !facturaData?.__singlePrintCopy) {
        const copias = conducePagado
          ? conduceEnvio
            ? [
                { label: 'CLIENTE', hideDetails: false },
                { label: 'CONDUCTOR', hideDetails: false },
                { label: 'CAJA', hideDetails: true },
              ]
            : [
                { label: 'CLIENTE', hideDetails: false },
                { label: 'CAJA', hideDetails: true },
              ]
          : [
              { label: 'CONDUCTOR', hideDetails: false },
              { label: 'CAJA', hideDetails: true },
            ];

        if (this.usarTrabajosSeparadosParaCorte()) {
          for (const [index, copia] of copias.entries()) {
            await this.imprimirConduceFactura80mm(
              {
                ...facturaData,
                __singlePrintCopy: true,
                __copyLabel: copia.label,
                __hideInvoiceDetails: copia.hideDetails,
              },
              items,
            );
            if (index < copias.length - 1) {
              await this.esperarEntreTrabajosImpresion();
            }
          }
          return;
        }

        const doc = new jsPDF({
          orientation: 'p',
          unit: 'mm',
          format: [80, 297],
        });

        for (const [index, copia] of copias.entries()) {
          if (index > 0) {
            (doc as any).addPage([80, 297], 'p');
          }
          await this.imprimirConduceFactura80mm(
            {
              ...facturaData,
              __singlePrintCopy: true,
              __copyLabel: copia.label,
              __hideInvoiceDetails: copia.hideDetails,
              __sharedDoc: doc,
              __deferPrint: true,
            },
            items,
          );
        }

        doc.autoPrint();
        const pdfBlob = doc.output('blob');
        await this.printBlob(pdfBlob, 'reporte');
        return;
      }

      const copyLabel = String(facturaData?.__copyLabel || '').trim();
      const hideInvoiceDetails = !!facturaData?.__hideInvoiceDetails;
      const doc =
        facturaData?.__sharedDoc ||
        new jsPDF({ orientation: 'p', unit: 'mm', format: [80, 297] });
      const pageWidth = 74;
      const centerX = pageWidth / 2;
      const leftMargin = 5;
      const rightMargin = 5;
      let yPos = 5;
      const drawDashedLine = (y: number) => {
        (doc as any).setLineDash([1, 1], 0);
        doc.line(leftMargin, y, pageWidth - rightMargin, y);
        (doc as any).setLineDash([], 0);
      };
      const centerText = (text: any, y: number, options?: any) => {
        doc.text(String(text), centerX, y, { align: 'center', ...options });
      };

      if (copyLabel) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(copyLabel, leftMargin, yPos);
      }

      try {
        const imgData = 'assets/logo2.png';
        doc.addImage(imgData, 'PNG', centerX - 10, yPos, 20, 20);
        yPos += 25;
      } catch {
        yPos += 5;
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      let empresa = 'CENTRO HIERRO MARCOS SRL';
      let direccion = 'CALLE 30 DE MARZO NO. 54';
      let telefono = '809-547-0022';
      let rncEmpresa = '101-66762-2';

      try {
        const empresaStorage = localStorage.getItem('empresa');
        if (empresaStorage && empresaStorage !== '[object Object]') {
          let parsedEmpresa = JSON.parse(empresaStorage);
          if (Array.isArray(parsedEmpresa)) parsedEmpresa = parsedEmpresa[0];
          if (parsedEmpresa) {
            if (typeof parsedEmpresa === 'string') {
              empresa = parsedEmpresa;
              direccion = localStorage.getItem('direccion_empresa') || direccion;
              telefono = localStorage.getItem('telefono_empresa') || telefono;
              rncEmpresa = localStorage.getItem('rnc_empresa') || rncEmpresa;
            } else {
              empresa = parsedEmpresa.nom_empre || empresa;
              direccion = parsedEmpresa.dir_empre || direccion;
              telefono = parsedEmpresa.tel_empre || telefono;
              rncEmpresa = parsedEmpresa.rnc_empre || rncEmpresa;
            }
          }
        }
      } catch {}

      centerText(empresa, yPos);
      yPos += 4;
      const dirSplit = doc.splitTextToSize(direccion, pageWidth - (leftMargin + rightMargin));
      doc.text(dirSplit, centerX, yPos, { align: 'center' });
      yPos += dirSplit.length * 4;
      centerText(`Tel: ${telefono}`, yPos);
      yPos += 4;
      centerText(`RNC: ${rncEmpresa}`, yPos);
      yPos += 6;
      drawDashedLine(yPos);
      yPos += 5;

      const f = this.datosFacturaImpresion(facturaData);
      const fecha = this.parseInvoiceDateTime(
        f.fa_fecFact,
        f.fa_fecfact,
        f.fa_fehora,
        f.fa_fechora,
      );
      const fechaHora = this.parseInvoiceDateTime(
        f.fa_fehora,
        f.fa_fechora,
        f.fa_fecFact,
        f.fa_fecfact,
      );
      const tieneHoraFactura = Boolean(String(f.fa_fehora ?? f.fa_fechora ?? '').trim());
      const formatDateShort = (date: Date) => {
        const d = new Date(date);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      };
      const formatTimeShort = (date: Date) => {
        const d = new Date(date);
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      };
      const formatoMoneda = new Intl.NumberFormat('es-DO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      doc.setFont('helvetica', 'bold');
      centerText('CONDUCE DE FACTURA', yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(`Factura: ${f.fa_codFact || ''}`, leftMargin, yPos);
      doc.text(formatDateShort(fecha), pageWidth - rightMargin, yPos, { align: 'right' });
      yPos += 4;
      if (tieneHoraFactura) {
        doc.text(`Hora: ${formatTimeShort(fechaHora)}`, leftMargin, yPos);
        yPos += 4;
      }
      doc.text(`Cliente: ${String(f.fa_nomClie || '')}`, leftMargin, yPos);
      yPos += 4;
      const vendedor = String(f.fa_nomVend || f.fa_codVend || '').trim();
      if (vendedor) {
        const vendedorLines = doc.splitTextToSize(`Vendedor: ${vendedor}`, pageWidth - (leftMargin + rightMargin));
        doc.text(vendedorLines, leftMargin, yPos);
        yPos += vendedorLines.length * 4;
      }
      doc.text(`Pago: ${this.etiquetaPagoConduce(f)}`, leftMargin, yPos);
      yPos += 4;
      doc.text(`Envio: ${this.etiquetaEnvioConduce(f)}`, leftMargin, yPos);
      yPos += 4;
      if (f.fa_dirClie) {
        const dirCliente = doc.splitTextToSize(`Dir: ${String(f.fa_dirClie)}`, pageWidth - (leftMargin + rightMargin));
        doc.text(dirCliente, leftMargin, yPos);
        yPos += dirCliente.length * 4;
      }
      if (f.fa_telClie) {
        doc.text(`Tel: ${String(f.fa_telClie)}`, leftMargin, yPos);
        yPos += 4;
      }

      drawDashedLine(yPos);
      yPos += 5;
      if (!hideInvoiceDetails) {
        doc.setFont('helvetica', 'bold');
        doc.text('Cant', leftMargin, yPos);
        doc.text('Descripcion', leftMargin + 12, yPos);
        doc.text('Total', pageWidth - rightMargin, yPos, { align: 'right' });
        yPos += 2;
        drawDashedLine(yPos);
        yPos += 4;
        doc.setFont('helvetica', 'normal');
      } else {
        doc.setFont('helvetica', 'bold');
        centerText('COPIA SIN DETALLE DE ARTICULOS', yPos);
        doc.setFont('helvetica', 'normal');
        yPos += 5;
      }

      let totalDetalle = 0;
      (items || []).forEach((item: any) => {
        const cantidad = Number(item.cantidad ?? item.df_canMerc ?? 0);
        const desc = String(item.producto?.in_desmerc ?? item.df_desMerc ?? '');
        const val = Number(item.total ?? item.df_valMerc ?? 0);
        totalDetalle += val;
        const descLines = doc.splitTextToSize(desc, 35);

        if (!hideInvoiceDetails) {
          doc.text(String(cantidad), leftMargin, yPos);
          doc.text(descLines, leftMargin + 12, yPos);
          doc.text(formatoMoneda.format(val), pageWidth - rightMargin, yPos, { align: 'right' });
          yPos += Math.max(descLines.length * 4, 4) + 2;
        }
      });

      drawDashedLine(yPos);
      yPos += 5;
      doc.setFont('helvetica', 'bold');
      const totalFactura = Number(f.fa_valFact ?? f.fa_valfact ?? 0);
      const totalConduce = totalFactura > 0 ? totalFactura : totalDetalle;
      doc.text('TOTAL', leftMargin, yPos);
      doc.text(formatoMoneda.format(totalConduce), pageWidth - rightMargin, yPos, { align: 'right' });
      yPos += 6;

      const numeroFactura = String(f.fa_codFact || '').trim();
      if (numeroFactura) {
        try {
          const canvas = document.createElement('canvas');
          JsBarcode(canvas, numeroFactura, {
            format: 'CODE128',
            displayValue: true,
            fontSize: 12,
            height: 42,
            margin: 0,
          });
          const barcodeData = canvas.toDataURL('image/png');
          doc.addImage(barcodeData, 'PNG', centerX - 25, yPos, 50, 15);
          yPos += 18;
        } catch (error) {
          console.error('Error generando codigo de barras del conduce:', error);
        }
      }

      yPos += 6;
      doc.setLineWidth(0.3);
      doc.line(leftMargin, yPos, pageWidth - rightMargin, yPos);
      yPos += 5;
      centerText('Recibido Conforme', yPos);
      yPos += 25;
      doc.text('.', leftMargin, yPos);

      if (!facturaData?.__deferPrint) {
        doc.autoPrint();
        const pdfBlob = doc.output('blob');
        await this.printBlob(pdfBlob, 'reporte');
      }
    } catch (error) {
      console.error('Error al generar conduce:', error);
    }
  }

  async imprimirCotizacion80mm(cotizacionData: any, items: any[], itbisGeneral?: any) {
    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: [80, 297],
      });
      const pageWidth = 74;
      const centerX = pageWidth / 2;
      const leftMargin = 5;
      const rightMargin = 5;
      let yPos = 5;

      const formatoMoneda = new Intl.NumberFormat('es-DO', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const formatDate = (value: any): string => {
        const date = this.parseInvoiceDateTime(value);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      };
      const centerText = (text: string | string[], y: number, options?: any) => {
        doc.text(text, centerX, y, { align: 'center', ...options });
      };
      const drawDashedLine = (y: number) => {
        (doc as any).setLineDash([1, 1], 0);
        doc.line(leftMargin, y, pageWidth - rightMargin, y);
        (doc as any).setLineDash([], 0);
      };
      const pick = (...values: any[]): string => {
        for (const value of values) {
          const text = String(value ?? '').trim();
          if (text) return text;
        }
        return '';
      };
      const porcentajeItbis = Number(
        itbisGeneral?.porcentaje ??
          itbisGeneral?.itebis ??
          itbisGeneral?.itbis ??
          18,
      ) || 0;
      const porcentajeMenos = Number(
        itbisGeneral?.porcentaje_menos ??
          itbisGeneral?.itbismeno ??
          itbisGeneral?.itbis_menos ??
          (porcentajeItbis ? porcentajeItbis / (1 + porcentajeItbis / 100) : 0),
      ) || 0;
      const tasaMenos = porcentajeMenos / 100;

      let empresa = 'CENTRO HIERRO MARCOS SRL';
      let direccion = 'CALLE 30 DE MARZO NO. 54';
      let telefono = '809-547-0022';
      let rncEmpresa = '101-66762-2';

      try {
        const empresaStorage = localStorage.getItem('empresa');
        if (empresaStorage && empresaStorage !== '[object Object]') {
          let parsedEmpresa = JSON.parse(empresaStorage);
          if (Array.isArray(parsedEmpresa)) parsedEmpresa = parsedEmpresa[0];
          if (parsedEmpresa) {
            if (typeof parsedEmpresa === 'string') {
              empresa = parsedEmpresa;
              direccion = localStorage.getItem('direccion_empresa') || direccion;
              telefono = localStorage.getItem('telefono_empresa') || telefono;
              rncEmpresa = localStorage.getItem('rnc_empresa') || rncEmpresa;
            } else {
              empresa = parsedEmpresa.nom_empre || empresa;
              direccion = parsedEmpresa.dir_empre || direccion;
              telefono = parsedEmpresa.tel_empre || telefono;
              rncEmpresa = parsedEmpresa.rnc_empre || rncEmpresa;
            }
          }
        }
      } catch (error) {
        console.warn('Error recuperando datos de empresa para cotizacion', error);
      }

      try {
        const imgData = 'assets/logo2.png';
        const imgWidth = 20;
        const imgHeight = 20;
        doc.addImage(imgData, 'PNG', centerX - imgWidth / 2, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 4;
      } catch {
        yPos += 3;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      centerText(empresa, yPos);
      yPos += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      const dirSplit = doc.splitTextToSize(direccion, pageWidth - leftMargin - rightMargin);
      centerText(dirSplit, yPos);
      yPos += dirSplit.length * 3.5;
      centerText(`Tel: ${telefono}`, yPos);
      yPos += 3.5;
      centerText(`RNC: ${rncEmpresa}`, yPos);
      yPos += 5;

      drawDashedLine(yPos);
      yPos += 5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      centerText('COTIZACION', yPos);
      yPos += 5;

      const numero = pick(cotizacionData?.ct_codcoti, cotizacionData?.numero);
      const fecha = pick(cotizacionData?.ct_feccoti, cotizacionData?.fecha);
      const vendedor = pick(cotizacionData?.ct_nomvend, cotizacionData?.ct_codvend);
      const cliente = pick(cotizacionData?.ct_nomclie, 'CLIENTE GENERICO');
      const rncCliente = pick(cotizacionData?.ct_rnc);
      const telefonoCliente = pick(cotizacionData?.ct_telclie);
      const direccionCliente = pick(cotizacionData?.ct_dirclie);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`No.: ${numero}`, leftMargin, yPos);
      yPos += 4;
      doc.text(`Fecha: ${fecha ? formatDate(fecha) : formatDate(new Date())}`, leftMargin, yPos);
      yPos += 4;
      if (vendedor) {
        doc.text(`Vendedor: ${vendedor}`, leftMargin, yPos);
        yPos += 4;
      }

      drawDashedLine(yPos);
      yPos += 5;

      doc.setFont('helvetica', 'bold');
      doc.text('CLIENTE', leftMargin, yPos);
      yPos += 4;
      doc.setFont('helvetica', 'normal');
      const clienteSplit = doc.splitTextToSize(cliente, pageWidth - leftMargin - rightMargin);
      doc.text(clienteSplit, leftMargin, yPos);
      yPos += clienteSplit.length * 3.5;
      if (rncCliente) {
        doc.text(`RNC/Cedula: ${rncCliente}`, leftMargin, yPos);
        yPos += 4;
      }
      if (telefonoCliente) {
        doc.text(`Tel.: ${telefonoCliente}`, leftMargin, yPos);
        yPos += 4;
      }
      if (direccionCliente) {
        const direccionSplit = doc.splitTextToSize(`Dir.: ${direccionCliente}`, pageWidth - leftMargin - rightMargin);
        doc.text(direccionSplit, leftMargin, yPos);
        yPos += direccionSplit.length * 3.5;
      }

      drawDashedLine(yPos);
      yPos += 5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      const xCant = leftMargin;
      const xDesc = 13;
      const xPrecio = 41;
      const xItbis = 55;
      const xTotal = pageWidth - rightMargin;
      doc.text('CANT', xCant, yPos);
      doc.text('DESC', xDesc, yPos);
      doc.text('P/S ITBIS', xPrecio, yPos, { align: 'right' });
      doc.text(`ITBIS ${formatoMoneda.format(porcentajeItbis)}%`, xItbis, yPos, { align: 'right' });
      doc.text('TOTAL', xTotal, yPos, { align: 'right' });
      yPos += 3;
      drawDashedLine(yPos);
      yPos += 4;

      doc.setFont('helvetica', 'normal');
      let subtotal = 0;
      let totalItbis = 0;
      let totalIncluido = 0;

      (items || []).forEach((item: any) => {
        const cantidad = Number(item?.dc_canmerc ?? item?.cantidad ?? 0) || 0;
        const precio = Number(item?.dc_premerc ?? item?.precio ?? 0) || 0;
        const total = Number(item?.dc_valmerc ?? item?.total ?? cantidad * precio) || 0;
        const itbisUnitario = precio * tasaMenos;
        const precioSinItbis = precio - itbisUnitario;
        const itbisItem = itbisUnitario * cantidad;
        const subtotalItem = precioSinItbis * cantidad;
        const descripcion = pick(
          item?.dc_descrip,
          item?.descripcion,
          item?.producto?.in_desmerc,
        );
        subtotal += subtotalItem;
        totalItbis += itbisItem;
        totalIncluido += total || subtotalItem + itbisItem;

        const descSplit = doc.splitTextToSize(descripcion, 24);
        doc.text(formatoMoneda.format(cantidad), xCant, yPos);
        doc.text(descSplit, xDesc, yPos);
        doc.text(formatoMoneda.format(precioSinItbis), xPrecio, yPos, { align: 'right' });
        doc.text(formatoMoneda.format(itbisItem), xItbis, yPos, { align: 'right' });
        doc.text(formatoMoneda.format(total), xTotal, yPos, { align: 'right' });
        yPos += Math.max(4, descSplit.length * 3.5 + 1);
      });

      const itbis = totalItbis || Number(cotizacionData?.ct_itbis ?? 0) || 0;
      const totalGeneral = totalIncluido || Number(cotizacionData?.ct_valcoti ?? 0) || subtotal + itbis;

      drawDashedLine(yPos);
      yPos += 5;
      doc.setFontSize(8);
      const labelX = 43;
      doc.text('Subtotal', labelX, yPos, { align: 'right' });
      doc.text(formatoMoneda.format(subtotal), xTotal, yPos, { align: 'right' });
      yPos += 4;
      doc.text('ITBIS', labelX, yPos, { align: 'right' });
      doc.text(formatoMoneda.format(itbis), xTotal, yPos, { align: 'right' });
      yPos += 4;
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL', labelX, yPos, { align: 'right' });
      doc.text(formatoMoneda.format(totalGeneral), xTotal, yPos, { align: 'right' });
      yPos += 6;

      drawDashedLine(yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      centerText('Estos precios estan sujetos a cambio', yPos);
      yPos += 3.5;
      centerText('sin previo aviso.', yPos);
      yPos += 5;
      doc.setFont('helvetica', 'bold');
      centerText('*** Gracias por preferirnos ***', yPos);
      yPos += 8;
      doc.text('.', leftMargin, yPos);

      doc.autoPrint();
      const pdfBlob = doc.output('blob');
      await this.printBlob(pdfBlob, 'ticket');
    } catch (error) {
      console.error('Error al generar cotizacion 80mm:', error);
      throw error;
    }
  }

  private async printPdf(pdfUrl: string, profileKey: DesktopPrintProfileKey): Promise<void> {
    const silentPrinted = await this.trySilentPrintDesktop(pdfUrl, profileKey);
    if (silentPrinted) return;

    const isDesktop = typeof window !== 'undefined' && !!window.electronAPI?.isDesktop;
    if (isDesktop) {
      try {
        URL.revokeObjectURL(pdfUrl);
      } catch {}
      throw new Error(
        'No se pudo imprimir en silencio con la impresora configurada. Revisa la configuración desktop o prueba la impresora desde Configuración global.'
      );
    }

    if (!isDesktop) {
      // Intento 1 web: abrir en nueva pestaña y disparar impresión
      try {
        const win = window.open(pdfUrl, '_blank');
        if (win) {
          win.focus();
          setTimeout(() => {
            try {
              win.print();
            } catch {}
          }, 600);
          return;
        }
      } catch {}
    }

    // Fallback: iframe oculto dentro de la misma app
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
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
          try {
            URL.revokeObjectURL(pdfUrl);
          } catch {}
        }, 2000);
      }
    };
    iframe.src = pdfUrl;
  }

  async printBlob(blob: Blob, profileKey: DesktopPrintProfileKey): Promise<void> {
    const isDesktop = typeof window !== 'undefined' && !!window.electronAPI?.isDesktop;
    if (isDesktop && window.electronAPI?.printPdfSilently) {
      try {
        const base64Data = await this.blobToBase64(blob);
        const deviceName = await this.desktopPrintSettings.getProfileDeviceName(profileKey);
        const result = await window.electronAPI.printPdfSilently({
          base64Data,
          deviceName,
          profileKey,
        });

        if (!result?.success) {
          console.error('[PrintingService] Falló printPdfSilently desde printBlob', result);
          throw new Error(
            result?.error ||
              'No se pudo imprimir en silencio con la impresora configurada.'
          );
        }

        return;
      } catch (error) {
        console.error('[PrintingService] Error imprimiendo blob en desktop', error);
        throw error;
      }
    }

    const pdfUrl = URL.createObjectURL(blob);
    try {
      await this.printPdf(pdfUrl, profileKey);
    } catch (error) {
      try {
        URL.revokeObjectURL(pdfUrl);
      } catch {}
      throw error;
    }
  }

  async savePdfBlobToDesktop(
    blob: Blob,
    filename: string,
    directory = 'C:\\cotizacion'
  ): Promise<string> {
    if (typeof window === 'undefined' || !window.electronAPI?.savePdfFile) {
      throw new Error(
        'Guardar el PDF en una carpeta local solo esta disponible en la app desktop.'
      );
    }

    const base64Data = await this.blobToBase64(blob);
    const result = await window.electronAPI.savePdfFile({
      base64Data,
      directory,
      filename,
    });

    if (!result?.success || !result.filepath) {
      throw new Error(result?.error || 'No se pudo guardar el PDF.');
    }

    return result.filepath;
  }

  async printHtmlContent(html: string, profileKey: DesktopPrintProfileKey): Promise<void> {
    const silentPrinted = await this.trySilentPrintHtmlDesktop(html, profileKey);
    if (silentPrinted) return;

    const isDesktop = typeof window !== 'undefined' && !!window.electronAPI?.isDesktop;
    if (isDesktop) {
      throw new Error(
        'No se pudo imprimir en silencio con la impresora configurada. Revisa la configuración desktop o prueba la impresora desde Configuración global.'
      );
    }

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      throw new Error('No se pudo abrir la ventana de impresión.');
    }

    win.document.open();
    win.document.write(html);
    win.document.close();

    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch {}
    }, 500);
  }

  private async trySilentPrintDesktop(
    pdfUrl: string,
    profileKey: DesktopPrintProfileKey
  ): Promise<boolean> {
    if (typeof window === 'undefined' || !window.electronAPI?.printPdfSilently) {
      return false;
    }

    try {
      const base64Data = await this.blobUrlToBase64(pdfUrl);
      const deviceName = await this.desktopPrintSettings.getProfileDeviceName(profileKey);
      const result = await window.electronAPI.printPdfSilently({ base64Data, deviceName, profileKey });
      if (!result?.success) {
        console.error('[PrintingService] Falló printPdfSilently', result);
      }
      return !!result?.success;
    } catch (error) {
      console.warn('No se pudo imprimir en modo silencioso con Electron:', error);
      return false;
    }
  }

  private async trySilentPrintHtmlDesktop(
    html: string,
    profileKey: DesktopPrintProfileKey
  ): Promise<boolean> {
    if (typeof window === 'undefined' || !window.electronAPI?.printHtmlSilently) {
      return false;
    }

    try {
      const deviceName = await this.desktopPrintSettings.getProfileDeviceName(profileKey);
      const result = await window.electronAPI.printHtmlSilently({
        html,
        deviceName,
        profileKey,
      });
      if (!result?.success) {
        console.error('[PrintingService] Falló printHtmlSilently', result);
      }
      return !!result?.success;
    } catch (error) {
      console.warn('No se pudo imprimir HTML en modo silencioso con Electron:', error);
      return false;
    }
  }

  private async blobUrlToBase64(blobUrl: string): Promise<string> {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return this.blobToBase64(blob);
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    const arrayBuffer = await blob.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }

    return btoa(binary);
  }
numeroALetras(numero: number): string {

  const unidades = ["","UNO","DOS","TRES","CUATRO","CINCO","SEIS","SIETE","OCHO","NUEVE"];
  const decenas = ["","DIEZ","VEINTE","TREINTA","CUARENTA","CINCUENTA","SESENTA","SETENTA","OCHENTA","NOVENTA"];
  const especiales = ["DIEZ","ONCE","DOCE","TRECE","CATORCE","QUINCE","DIECISEIS","DIECISIETE","DIECIOCHO","DIECINUEVE"];
  const centenas = ["","CIENTO","DOSCIENTOS","TRESCIENTOS","CUATROCIENTOS","QUINIENTOS","SEISCIENTOS","SETECIENTOS","OCHOCIENTOS","NOVECIENTOS"];

  const convertirMenorMil = (num:number):string => {

    if(num === 0) return "";
    if(num === 100) return "CIEN";

    let letras = "";

    if(num >= 100){
      letras += centenas[Math.floor(num/100)] + " ";
      num = num % 100;
    }

    if(num >= 10 && num < 20){
      letras += especiales[num-10];
      return letras;
    }

    if(num >= 20){
      letras += decenas[Math.floor(num/10)];
      num = num % 10;

      if(num > 0){
        letras += " Y " + unidades[num];
      }

      return letras;
    }

    if(num > 0){
      letras += unidades[num];
    }

    return letras;
  }

  const entero = Math.floor(numero);
  const centavos = Math.round((numero - entero) * 100);

  const millones = Math.floor(entero / 1000000);
  const miles = Math.floor((entero - millones * 1000000) / 1000);
  const resto = entero % 1000;

  let letras = "";

  // MILLONES
  if(millones > 0){
    if(millones === 1){
      letras += "UN MILLON ";
    }else{
      letras += convertirMenorMil(millones) + " MILLONES ";
    }
  }

  // MILES
  if(miles > 0){
    if(miles === 1){
      letras += "MIL ";
    }else{
      letras += convertirMenorMil(miles) + " MIL ";
    }
  }

  // RESTO
  letras += convertirMenorMil(resto);

  return `${letras.trim()} PESOS CON ${centavos.toString().padStart(2,'0')}/100`;
}
}
