import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { NotaCreditoService } from 'src/app/core/services/contabilidad/nota-credito/nota-credito.service';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { ServicioConfiguracionGlobal } from 'src/app/core/services/mantenimientos/configuracion-global/configuracion-global.service';
import Swal from 'sweetalert2';

interface CreditNoteLine {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  amount: number;
  taxAmount: number;
  total: number;
}

interface CreditNoteForm {
  creditNoteNumber: string;
  invoiceNumber: string;
  encf: string;
  issueDate: string;
  sequenceExpiration: string;
  modifiedNcf: string;
  modifiedDate: string;
  modificationCode: string;
  reason: string;
  paymentType: string;
  incomeType: string;
  issuerRnc: string;
  issuerName: string;
  issuerCommercialName: string;
  issuerAddress: string;
  buyerRnc: string;
  buyerName: string;
  buyerEmail: string;
  buyerAddress: string;
  notes: string;
}

@Component({
  selector: 'app-nota-credito',
  templateUrl: './nota-credito.html',
  styleUrls: ['./nota-credito.css'],
})
export class NotaCreditoComponent implements OnInit {
  private nextLineId = 1;
  form: CreditNoteForm = this.createInitialForm();
  lines: CreditNoteLine[] = [this.createLine()];
  isSending = false;
  isLoadingInvoice = false;
  invoiceMessage = 'Introduce el numero de factura para cargar el cliente y el e-NCF afectado.';
  lastStatus = 'Sin enviar';
  lastTrackId = '';
  lastSecurityCode = '';
  lastQrLink = '';
  lastRequestJson = '';
  lastResponseJson = '';

  readonly modificationCodes = [
    { value: '1', label: '1 - Anula e-CF' },
    { value: '2', label: '2 - Corrige texto del e-CF' },
    { value: '3', label: '3 - Corrige montos del e-CF' },
    { value: '4', label: '4 - Reemplaza e-CF emitido en contingencia' },
    { value: '5', label: '5 - Referencia a factura de consumo electronica' },
  ];

  readonly paymentTypes = [
    { value: '1', label: 'Contado' },
    { value: '2', label: 'Credito' },
    { value: '3', label: 'Gratuito' },
  ];

  readonly incomeTypes = [
    { value: '01', label: '01 - Ingresos por operaciones' },
    { value: '02', label: '02 - Ingresos financieros' },
    { value: '03', label: '03 - Ingresos extraordinarios' },
    { value: '04', label: '04 - Ingresos por arrendamientos' },
    { value: '05', label: '05 - Ingresos por venta de activo depreciable' },
    { value: '06', label: '06 - Otros ingresos' },
  ];

  constructor(
    private configuracionGlobal: ServicioConfiguracionGlobal,
    private servicioFacturacion: ServicioFacturacion,
    private notaCreditoService: NotaCreditoService,
  ) {}

  ngOnInit(): void {
    void this.ensureCreditNoteNumber();
  }

  get subtotal(): number {
    return this.round(this.lines.reduce((sum, line) => sum + line.amount, 0), 2);
  }

  get taxTotal(): number {
    return this.round(this.lines.reduce((sum, line) => sum + line.taxAmount, 0), 2);
  }

  get discountTotal(): number {
    return this.round(this.lines.reduce((sum, line) => sum + line.discount, 0), 2);
  }

  get grandTotal(): number {
    return this.round(this.lines.reduce((sum, line) => sum + line.total, 0), 2);
  }

  addLine(): void {
    this.lines = [...this.lines, this.createLine()];
  }

  removeLine(lineId: number): void {
    this.lines = this.lines.filter((line) => line.id !== lineId);
    if (!this.lines.length) {
      this.lines = [this.createLine()];
    }
  }

  updateLine(line: CreditNoteLine, field: 'description' | 'quantity' | 'unitPrice' | 'taxRate' | 'discount', value: string | number): void {
    const patchValue = field === 'description' ? String(value) : Number(value || 0);
    this.lines = this.lines.map((item) => {
      if (item.id !== line.id) {
        return item;
      }
      const next = {
        ...item,
        [field]: patchValue,
      } as CreditNoteLine;
      return this.recalculate(next);
    });
  }

  resetForm(): void {
    this.form = this.createInitialForm();
    this.nextLineId = 1;
    this.lines = [this.createLine()];
    this.invoiceMessage = 'Introduce el numero de factura para cargar el cliente y el e-NCF afectado.';
    this.lastStatus = 'Sin enviar';
    this.lastTrackId = '';
    this.lastSecurityCode = '';
    this.lastQrLink = '';
    this.lastRequestJson = '';
    this.lastResponseJson = '';
    void this.ensureCreditNoteNumber();
  }

  async loadInvoice(): Promise<void> {
    const invoiceNumber = String(this.form.invoiceNumber || '').trim();
    if (!invoiceNumber || this.isLoadingInvoice) return;

    this.isLoadingInvoice = true;
    this.invoiceMessage = `Buscando factura ${invoiceNumber}...`;
    try {
      const [invoiceResponse, detailResponse] = await Promise.all([
        firstValueFrom(this.servicioFacturacion.getByNumero(invoiceNumber)),
        firstValueFrom(this.servicioFacturacion.buscarFacturaDetalle(invoiceNumber)),
      ]);
      const invoice = invoiceResponse?.data || invoiceResponse;
      if (!invoice || invoiceResponse?.status === 'not_found') {
        throw new Error(`No se encontro la factura ${invoiceNumber}.`);
      }

      this.form.modifiedNcf = String(invoice?.fa_ncfFact || invoice?.fa_ncffact || '').trim();
      this.form.modifiedDate = this.toDateInput(invoice?.fa_fecFact || invoice?.fa_fecfact || this.form.modifiedDate);
      this.form.buyerRnc = this.cleanRnc(invoice?.fa_rncFact || invoice?.fa_rncfact);
      this.form.buyerName = String(invoice?.fa_nomClie || invoice?.fa_nomclie || '').trim();
      this.form.buyerEmail = String(invoice?.fa_correo || '').trim();
      this.form.buyerAddress = String(invoice?.fa_dirClie || invoice?.fa_dirclie || '').trim();
      this.form.paymentType = String(invoice?.fa_codfpago || invoice?.fa_fpago || this.form.paymentType || '1').trim().startsWith('2') ? '2' : '1';

      const details = Array.isArray(detailResponse?.data) ? detailResponse.data : [];
      if (details.length) {
        this.nextLineId = 1;
        this.lines = details.map((detail: any) => this.mapInvoiceDetailToLine(detail));
      }

      this.invoiceMessage = this.form.modifiedNcf
        ? `Factura ${invoiceNumber} cargada con e-NCF afectado ${this.form.modifiedNcf}.`
        : `Factura ${invoiceNumber} cargada, pero no tiene e-NCF afectado registrado.`;
    } catch (error: any) {
      console.error('[NotaCreditoComponent] Error cargando factura afectada', error);
      this.invoiceMessage = String(error?.message || 'No se pudo cargar la factura.');
      await Swal.fire('Factura no encontrada', this.invoiceMessage, 'warning');
    } finally {
      this.isLoadingInvoice = false;
    }
  }

  async sendToDgii(): Promise<void> {
    try {
      await this.ensureCreditNoteNumber();
    } catch (error: any) {
      await Swal.fire('Error', String(error?.message || 'No se pudo generar el numero de nota de credito.'), 'error');
      return;
    }

    const errors = this.validate();
    if (errors.length) {
      await Swal.fire('Faltan datos', errors.join('<br>'), 'warning');
      return;
    }

    this.isSending = true;
    try {
      if (!this.form.encf.trim()) {
        this.lastStatus = 'Generando e-NCF...';
        await this.generateCreditNoteEncf();
      }

      const scenario = this.buildDgiiScenario();
      this.lastRequestJson = JSON.stringify(scenario, null, 2);
      this.lastResponseJson = '';
      await this.saveCreditNote('Pendiente DGII');
      this.lastStatus = 'Enviando...';
      Swal.fire({
        title: 'Enviando nota de credito',
        text: 'Transmitiendo comprobante E34 a DGII...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading(),
      });

      const response = await firstValueFrom(
        this.configuracionGlobal.enviarDgiiDirectCert([scenario], this.cleanRnc(this.form.issuerRnc)),
      );
      const raw = response?.data ?? response;
      this.lastResponseJson = JSON.stringify(raw, null, 2);
      const normalized = this.normalizeDgiiResponse(raw);
      this.lastStatus = normalized.status || 'Enviado';
      this.lastTrackId = normalized.trackId || '';
      this.lastSecurityCode = normalized.securityCode || '';
      this.lastQrLink = normalized.qrLink || '';
      await this.saveCreditNote(this.lastStatus || 'Enviado');

      Swal.close();
      await Swal.fire('Completado', 'La nota de credito fue enviada a DGII.', 'success');
    } catch (error: any) {
      const rawError = error?.dgiiResponse || error?.details || error?.error || {
        message: error?.message || String(error),
      };
      this.lastResponseJson = JSON.stringify(rawError, null, 2);
      this.lastStatus = 'Error';
      await this.saveCreditNote('Error');
      console.error('[NotaCreditoComponent] Error enviando nota de credito a DGII', error);
      Swal.fire(
        'Error DGII',
        String(error?.error?.message || error?.details?.message || error?.message || 'No se pudo enviar la nota de credito a DGII.'),
        'error',
      );
    } finally {
      this.isSending = false;
    }
  }

  async saveDraft(): Promise<void> {
    try {
      await this.ensureCreditNoteNumber();
    } catch (error: any) {
      await Swal.fire('Error', String(error?.message || 'No se pudo generar el numero de nota de credito.'), 'error');
      return;
    }

    const baseErrors: string[] = [];
    if (!this.form.creditNoteNumber.trim()) baseErrors.push('Numero de nota de credito requerido.');
    if (!this.form.invoiceNumber.trim()) baseErrors.push('Numero de factura afectada requerido.');
    if (!this.lines.some((line) => line.description.trim())) baseErrors.push('Agrega al menos una linea de detalle.');
    if (baseErrors.length) {
      await Swal.fire('Faltan datos', baseErrors.join('<br>'), 'warning');
      return;
    }

    try {
      await this.saveCreditNote(this.lastStatus === 'Sin enviar' ? 'Borrador' : this.lastStatus);
      this.lastStatus = this.lastStatus === 'Sin enviar' ? 'Borrador' : this.lastStatus;
      await Swal.fire('Guardado', 'La nota de credito fue guardada en Supabase.', 'success');
    } catch (error: any) {
      console.error('[NotaCreditoComponent] Error guardando nota de credito', error);
      await Swal.fire('Error', String(error?.message || 'No se pudo guardar la nota de credito.'), 'error');
    }
  }

  private createInitialForm(): CreditNoteForm {
    const today = new Date().toISOString().slice(0, 10);
    return {
      creditNoteNumber: this.generateCreditNoteNumber(),
      invoiceNumber: '',
      encf: '',
      issueDate: today,
      sequenceExpiration: '',
      modifiedNcf: '',
      modifiedDate: today,
      modificationCode: '3',
      reason: '',
      paymentType: '1',
      incomeType: '01',
      issuerRnc: this.cleanRnc(localStorage.getItem('rnc_empresa')),
      issuerName: String(localStorage.getItem('nombre_empresa') || '').trim(),
      issuerCommercialName: String(localStorage.getItem('nombre_empresa') || '').trim(),
      issuerAddress: String(localStorage.getItem('direccion_empresa') || '').trim(),
      buyerRnc: '',
      buyerName: '',
      buyerEmail: '',
      buyerAddress: '',
      notes: '',
    };
  }

  private createLine(): CreditNoteLine {
    return this.recalculate({
      id: this.nextLineId++,
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 18,
      discount: 0,
      amount: 0,
      taxAmount: 0,
      total: 0,
    });
  }

  private recalculate(line: CreditNoteLine): CreditNoteLine {
    const base = Math.max(0, Number(line.quantity || 0) * Number(line.unitPrice || 0) - Number(line.discount || 0));
    const tax = base * (Number(line.taxRate || 0) / 100);
    return {
      ...line,
      amount: this.round(base, 2),
      taxAmount: this.round(tax, 2),
      total: this.round(base + tax, 2),
    };
  }

  private mapInvoiceDetailToLine(detail: any): CreditNoteLine {
    const quantity = Number(detail?.cantidad ?? detail?.df_canMerc ?? detail?.df_canmerc ?? 1) || 1;
    const grossTotal = Number(detail?.total ?? detail?.df_valMerc ?? detail?.df_valmerc ?? 0) || 0;
    const taxAmount = Number(detail?.df_itbiMerc ?? detail?.df_itbimerc ?? detail?.itbis ?? 0) || 0;
    const amount = Math.max(0, grossTotal - taxAmount);
    const taxRate = amount > 0 && taxAmount > 0 ? this.round((taxAmount / amount) * 100, 2) : 18;
    const unitPrice = quantity > 0 ? this.round(amount / quantity, 4) : 0;
    return this.recalculate({
      id: this.nextLineId++,
      description: String(detail?.producto?.in_desmerc || detail?.df_desMerc || detail?.df_desmerc || '').trim(),
      quantity,
      unitPrice,
      taxRate,
      discount: 0,
      amount: 0,
      taxAmount: 0,
      total: 0,
    });
  }

  private async generateCreditNoteEncf(): Promise<void> {
    const response = await firstValueFrom(this.servicioFacturacion.reservarEncf('34'));
    const encf = String(response?.data?.ncf || response?.ncf || '').trim();
    if (!encf) {
      throw new Error('No se pudo generar el e-NCF E34 para la nota de credito.');
    }
    this.form.encf = encf;
  }

  private generateCreditNoteNumber(): string {
    return '';
  }

  private async ensureCreditNoteNumber(): Promise<void> {
    if (String(this.form.creditNoteNumber || '').trim()) return;
    const response = await firstValueFrom(this.notaCreditoService.reservarNumero());
    const numero = String(response?.data?.numero || response?.numero || '').trim();
    if (!numero) {
      throw new Error('No se pudo generar el numero de nota de credito desde contfactura.');
    }
    this.form.creditNoteNumber = numero;
  }

  private toDateInput(value: any): string {
    const text = String(value || '').trim();
    if (!text) return new Date().toISOString().slice(0, 10);
    const dateOnly = text.split('T')[0].split(' ')[0];
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
    if (iso) return dateOnly;
    const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dateOnly);
    if (dmy) {
      return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    }
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
  }

  private validate(): string[] {
    const errors: string[] = [];
    if (!this.cleanRnc(this.form.issuerRnc)) errors.push('RNC emisor requerido.');
    if (!this.form.issuerName.trim()) errors.push('Razon social del emisor requerida.');
    if (!this.form.issuerAddress.trim()) errors.push('Direccion del emisor requerida.');
    if (!this.form.creditNoteNumber.trim()) errors.push('Numero de nota de credito requerido.');
    if (!this.form.invoiceNumber.trim()) errors.push('Numero de factura afectada requerido.');
    if (!this.form.modifiedNcf.trim()) errors.push('NCF/e-NCF afectado requerido.');
    if (!this.form.reason.trim()) errors.push('Motivo de modificacion requerido.');
    if (!this.form.buyerName.trim()) errors.push('Nombre o razon social del comprador requerido.');
    if (!this.lines.some((line) => line.description.trim() && line.quantity > 0 && line.unitPrice > 0)) {
      errors.push('Agrega al menos una linea con descripcion, cantidad y precio.');
    }
    return errors;
  }

  private buildDgiiScenario(): any {
    const scenario: any = {
      Version: '1.0',
      TipoeCF: '34',
      ENCF: this.form.encf.trim(),
      FechaVencimientoSecuencia: this.formatDgiiDate(this.form.sequenceExpiration),
      IndicadorMontoGravado: '0',
      TipoIngresos: this.form.incomeType,
      TipoPago: this.form.paymentType,
      RNCEmisor: this.cleanRnc(this.form.issuerRnc),
      RazonSocialEmisor: this.form.issuerName.trim(),
      NombreComercial: this.form.issuerCommercialName.trim() || this.form.issuerName.trim(),
      DireccionEmisor: this.form.issuerAddress.trim(),
      FechaEmision: this.formatDgiiDate(this.form.issueDate),
      RNCComprador: this.cleanRnc(this.form.buyerRnc),
      RazonSocialComprador: this.form.buyerName.trim(),
      CorreoComprador: this.form.buyerEmail.trim(),
      DireccionComprador: this.form.buyerAddress.trim(),
      NCFModificado: this.form.modifiedNcf.trim(),
      FechaNCFModificado: this.formatDgiiDate(this.form.modifiedDate),
      CodigoModificacion: this.form.modificationCode,
      RazonModificacion: this.form.reason.trim(),
      MontoGravadoTotal: this.subtotal.toFixed(2),
      TotalITBIS: this.taxTotal.toFixed(2),
      MontoTotal: this.grandTotal.toFixed(2),
      MontoPeriodo: this.grandTotal.toFixed(2),
      ValorPagar: this.grandTotal.toFixed(2),
      CasoPrueba: `${this.cleanRnc(this.form.issuerRnc)}${this.form.encf.trim()}`,
      NumeroNotaCredito: this.form.creditNoteNumber.trim(),
      NumeroFacturaInterna: this.form.invoiceNumber.trim(),
      Observaciones: this.form.notes.trim(),
    };

    this.lines.forEach((line, index) => {
      const lineNumber = index + 1;
      scenario[`NumeroLinea[${lineNumber}]`] = lineNumber;
      scenario[`NombreItem[${lineNumber}]`] = line.description.trim();
      scenario[`IndicadorBienoServicio[${lineNumber}]`] = '1';
      scenario[`CantidadItem[${lineNumber}]`] = Number(line.quantity || 0).toFixed(2);
      scenario[`PrecioUnitarioItem[${lineNumber}]`] = Number(line.unitPrice || 0).toFixed(4);
      scenario[`DescuentoMonto[${lineNumber}]`] = Number(line.discount || 0).toFixed(2);
      scenario[`MontoItem[${lineNumber}]`] = line.amount.toFixed(2);
      scenario[`MontoITBIS[${lineNumber}]`] = line.taxAmount.toFixed(2);
      scenario[`TasaITBIS[${lineNumber}]`] = Number(line.taxRate || 0).toFixed(2);
      scenario[`IndicadorFacturacion[${lineNumber}]`] = '1';
    });

    scenario['FormaPago[1]'] = this.form.paymentType;
    scenario['MontoPago[1]'] = this.grandTotal.toFixed(2);

    Object.keys(scenario).forEach((key) => {
      if (scenario[key] === '' || scenario[key] === null || scenario[key] === undefined) {
        delete scenario[key];
      }
    });
    return scenario;
  }

  private async saveCreditNote(status: string): Promise<void> {
    const payload = {
      header: {
        nc_numero: this.form.creditNoteNumber.trim(),
        nc_factura: this.form.invoiceNumber.trim(),
        nc_encf: this.form.encf.trim() || null,
        nc_fecha: this.form.issueDate || null,
        nc_vencimiento: this.form.sequenceExpiration || null,
        nc_ncf_modificado: this.form.modifiedNcf.trim() || null,
        nc_fecha_modificada: this.form.modifiedDate || null,
        nc_codigo_modificacion: this.form.modificationCode || null,
        nc_motivo: this.form.reason.trim() || null,
        nc_tipo_pago: this.form.paymentType || null,
        nc_tipo_ingreso: this.form.incomeType || null,
        emisor_rnc: this.cleanRnc(this.form.issuerRnc) || null,
        emisor_nombre: this.form.issuerName.trim() || null,
        emisor_nombre_comercial: this.form.issuerCommercialName.trim() || null,
        emisor_direccion: this.form.issuerAddress.trim() || null,
        comprador_rnc: this.cleanRnc(this.form.buyerRnc) || null,
        comprador_nombre: this.form.buyerName.trim() || null,
        comprador_correo: this.form.buyerEmail.trim() || null,
        comprador_direccion: this.form.buyerAddress.trim() || null,
        notas: this.form.notes.trim() || null,
        subtotal: this.subtotal,
        descuento_total: this.discountTotal,
        itbis_total: this.taxTotal,
        total: this.grandTotal,
        estado_dgii: status || this.lastStatus || null,
        track_id: this.lastTrackId || null,
        codigo_seguridad: this.lastSecurityCode || null,
        qr_link: this.lastQrLink || null,
        request_json: this.safeJson(this.lastRequestJson),
        response_json: this.safeJson(this.lastResponseJson),
      },
      lines: this.lines.map((line, index) => ({
        linea: index + 1,
        descripcion: line.description,
        cantidad: line.quantity,
        precio: line.unitPrice,
        descuento: line.discount,
        itbis_porcentaje: line.taxRate,
        monto: line.amount,
        itbis_monto: line.taxAmount,
        total: line.total,
      })),
    };

    await firstValueFrom(this.notaCreditoService.guardar(payload));
  }

  private normalizeDgiiResponse(raw: any): { status: string; trackId: string; securityCode: string; qrLink: string } {
    const root = raw?.data && typeof raw.data === 'object' ? raw.data : raw;
    const payload = root?.data && typeof root.data === 'object' ? root.data : root;
    const first = Array.isArray(payload?.results) ? payload.results[0] : null;
    const nested = first || payload?.result || payload || {};
    const rfce = nested?.rfceInfo || {};
    const ecf = nested?.ecfInfo || {};
    const responseXml = nested?.responseXML || {};
    const responseRfce = nested?.responseRFCE || {};
    const dgii = responseRfce?.dgiiResponse || responseXml?.dgiiResponse || {};
    return {
      status: this.pick(nested?.estado_dgii, nested?.rfceEstado, nested?.estado, dgii?.estado, nested?.status),
      trackId: this.pick(nested?.trackId, payload?.trackId, root?.trackId, dgii?.trackId),
      securityCode: this.pick(nested?.codseguridad, nested?.codigoSeguridad, rfce?.codigoSeguridad, ecf?.codigoSeguridad, dgii?.codigoSeguridad),
      qrLink: this.pick(nested?.qr_link, nested?.qrUrl, rfce?.link_original, responseXml?.qrUrl, responseRfce?.qrUrl, dgii?.qrUrl),
    };
  }

  private pick(...values: any[]): string {
    for (const value of values) {
      const text = String(value ?? '').trim();
      if (text) return text;
    }
    return '';
  }

  private cleanRnc(value: any): string {
    return String(value || '').replace(/\D/g, '');
  }

  private formatDgiiDate(value: string): string {
    const text = String(value || '').trim();
    if (!text) return '';
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : text;
  }

  private safeJson(value: string): any | null {
    const text = String(value || '').trim();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return { value: text };
    }
  }

  private round(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round((Number(value || 0) + Number.EPSILON) * factor) / factor;
  }
}
