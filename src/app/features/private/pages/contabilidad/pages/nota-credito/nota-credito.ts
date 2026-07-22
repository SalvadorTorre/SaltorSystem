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
  activeSection: 'crear' | 'consultar' = 'crear';
  consultaFiltro = '';
  consultaCargando = false;
  notasCredito: any[] = [];
  notaConsultada: any | null = null;
  detalleConsultado: any[] = [];
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

  cambiarSeccion(section: 'crear' | 'consultar'): void {
    this.activeSection = section;
    if (section === 'consultar') {
      this.consultarNotas();
    }
  }

  consultarNotas(): void {
    if (this.consultaCargando) return;
    this.consultaCargando = true;
    this.notaCreditoService.listar(this.consultaFiltro).subscribe({
      next: (response) => {
        this.notasCredito = Array.isArray(response?.data) ? response.data : [];
        this.consultaCargando = false;
      },
      error: async (error) => {
        this.consultaCargando = false;
        await Swal.fire('Error', String(error?.message || 'No se pudieron consultar las notas de credito.'), 'error');
      },
    });
  }

  consultarNota(nota: any): void {
    const numero = String(nota?.nc_numero || '').trim();
    if (!numero) return;
    this.notaCreditoService.consultar(numero).subscribe({
      next: (response) => {
        this.notaConsultada = response?.data?.header || nota;
        this.detalleConsultado = Array.isArray(response?.data?.lines) ? response.data.lines : [];
      },
      error: async (error) => {
        await Swal.fire('Error', String(error?.message || 'No se pudo consultar la nota de credito.'), 'error');
      },
    });
  }

  async reenviarNotaDgii(nota: any): Promise<void> {
    const confirmacion = await Swal.fire({
      title: 'Reenviar nota de credito',
      text: `Se reenviara la nota ${nota?.nc_numero || ''} a DGII.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Reenviar',
      cancelButtonText: 'Cancelar',
    });
    if (!confirmacion.isConfirmed) return;

    try {
      const response = await firstValueFrom(this.notaCreditoService.consultar(nota?.nc_numero));
      const data = response?.data;
      if (!data?.header) throw new Error('No se encontro la nota de credito guardada.');
      this.cargarNotaGuardada(data.header, data.lines || []);
      this.activeSection = 'crear';
      await this.sendToDgii();
      this.consultarNotas();
    } catch (error: any) {
      await Swal.fire('Error', String(error?.message || 'No se pudo reenviar la nota de credito.'), 'error');
    }
  }

  async imprimirNota(nota: any): Promise<void> {
    const ventana = window.open('', '_blank', 'width=960,height=760');
    if (!ventana) {
      await Swal.fire('Impresion bloqueada', 'Permita ventanas emergentes para imprimir la nota.', 'warning');
      return;
    }
    ventana.document.write('<p style="font-family:Arial;padding:20px">Preparando nota de credito...</p>');

    try {
      const response = await firstValueFrom(this.notaCreditoService.consultar(nota?.nc_numero));
      const header = response?.data?.header;
      const lines = Array.isArray(response?.data?.lines) ? response.data.lines : [];
      if (!header) throw new Error('No se encontro la nota de credito.');
      const filas = lines.map((linea: any) => `
        <tr>
          <td>${this.escapeHtml(linea.linea)}</td><td>${this.escapeHtml(linea.descripcion)}</td>
          <td class="num">${this.formatoNumero(linea.cantidad)}</td><td class="num">${this.formatoMoneda(linea.precio)}</td>
          <td class="num">${this.formatoMoneda(linea.itbis_monto)}</td><td class="num">${this.formatoMoneda(linea.total)}</td>
        </tr>`).join('');
      ventana.document.open();
      ventana.document.write(`<!doctype html><html><head><title>Nota ${this.escapeHtml(header.nc_numero)}</title><style>
        body{font-family:Arial,sans-serif;color:#111;margin:28px}h1{text-align:center;font-size:22px;margin:0 0 6px}.center{text-align:center}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin:22px 0}.label{font-size:11px;color:#555;text-transform:uppercase}.value{font-weight:700;margin-top:2px}table{border-collapse:collapse;width:100%;margin-top:18px}th,td{border:1px solid #bbb;padding:7px;font-size:12px}th{background:#eee}.num{text-align:right}.totals{margin-left:auto;margin-top:16px;width:300px}.totals div{display:flex;justify-content:space-between;padding:5px}.total{border-top:2px solid #111;font-size:16px;font-weight:700}@media print{button{display:none}}
      </style></head><body>
        <h1>NOTA DE CREDITO</h1><div class="center">${this.escapeHtml(header.emisor_nombre || '')}</div>
        <div class="grid">
          <div><div class="label">Numero</div><div class="value">${this.escapeHtml(header.nc_numero)}</div></div>
          <div><div class="label">e-NCF</div><div class="value">${this.escapeHtml(header.nc_encf || '-')}</div></div>
          <div><div class="label">Fecha</div><div class="value">${this.escapeHtml(header.nc_fecha || '-')}</div></div>
          <div><div class="label">Factura afectada</div><div class="value">${this.escapeHtml(header.nc_factura || '-')}</div></div>
          <div><div class="label">Comprador</div><div class="value">${this.escapeHtml(header.comprador_nombre || '-')}</div></div>
          <div><div class="label">Estado DGII</div><div class="value">${this.escapeHtml(header.estado_dgii || 'Sin enviar')}</div></div>
          <div style="grid-column:1/-1"><div class="label">Motivo</div><div class="value">${this.escapeHtml(header.nc_motivo || '-')}</div></div>
        </div>
        <table><thead><tr><th>Linea</th><th>Descripcion</th><th>Cantidad</th><th>Precio</th><th>ITBIS</th><th>Total</th></tr></thead><tbody>${filas}</tbody></table>
        <div class="totals"><div><span>Subtotal</span><strong>${this.formatoMoneda(header.subtotal)}</strong></div><div><span>ITBIS</span><strong>${this.formatoMoneda(header.itbis_total)}</strong></div><div class="total"><span>Total</span><strong>${this.formatoMoneda(header.total)}</strong></div></div>
        <script>window.onload=()=>{window.print();}</script></body></html>`);
      ventana.document.close();
    } catch (error: any) {
      ventana.close();
      await Swal.fire('Error', String(error?.message || 'No se pudo imprimir la nota de credito.'), 'error');
    }
  }

  private cargarNotaGuardada(header: any, lines: any[]): void {
    this.form = {
      creditNoteNumber: String(header.nc_numero || ''), invoiceNumber: String(header.nc_factura || ''),
      encf: String(header.nc_encf || ''), issueDate: this.toDateInput(header.nc_fecha),
      sequenceExpiration: header.nc_vencimiento ? this.toDateInput(header.nc_vencimiento) : '',
      modifiedNcf: String(header.nc_ncf_modificado || ''), modifiedDate: this.toDateInput(header.nc_fecha_modificada),
      modificationCode: String(header.nc_codigo_modificacion || '3'), reason: String(header.nc_motivo || ''),
      paymentType: String(header.nc_tipo_pago || '1'), incomeType: String(header.nc_tipo_ingreso || '01'),
      issuerRnc: String(header.emisor_rnc || ''), issuerName: String(header.emisor_nombre || ''),
      issuerCommercialName: String(header.emisor_nombre_comercial || ''), issuerAddress: String(header.emisor_direccion || ''),
      buyerRnc: String(header.comprador_rnc || ''), buyerName: String(header.comprador_nombre || ''),
      buyerEmail: String(header.comprador_correo || ''), buyerAddress: String(header.comprador_direccion || ''),
      notes: String(header.notas || ''),
    };
    this.nextLineId = 1;
    this.lines = lines.map((line: any) => this.recalculate({
      id: this.nextLineId++, description: String(line.descripcion || ''), quantity: Number(line.cantidad || 0),
      unitPrice: Number(line.precio || 0), taxRate: Number(line.itbis_porcentaje || 0),
      discount: Number(line.descuento || 0), amount: 0, taxAmount: 0, total: 0,
    }));
    if (!this.lines.length) this.lines = [this.createLine()];
    this.lastStatus = String(header.estado_dgii || 'Rechazado');
    this.lastTrackId = String(header.track_id || '');
    this.lastSecurityCode = String(header.codigo_seguridad || '');
    this.lastQrLink = String(header.qr_link || '');
    this.lastRequestJson = header.request_json ? JSON.stringify(header.request_json, null, 2) : '';
    this.lastResponseJson = header.response_json ? JSON.stringify(header.response_json, null, 2) : '';
  }

  private formatoMoneda(value: any): string {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(Number(value || 0));
  }

  private formatoNumero(value: any): string {
    return new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));
  }

  esEstadoRechazado(nota: any): boolean {
    const estado = String(nota?.estado_dgii || '').trim().toLowerCase();
    return estado.includes('rechaz') || estado.includes('error');
  }

  verMensajeDgii(nota: any): void {
    const respuesta = nota?.response_json || {};
    const mensajes = this.extraerMensajesDgii(respuesta);
    const responseCompleto = this.escapeHtml(JSON.stringify(respuesta, null, 2));
    const listaMensajes = mensajes.length
      ? `<ul style="text-align:left;margin:0;padding-left:1.25rem">${mensajes.map((mensaje) => `<li>${this.escapeHtml(mensaje)}</li>`).join('')}</ul>`
      : '<p style="text-align:left;margin:0">DGII no devolvio un mensaje descriptivo.</p>';

    void Swal.fire({
      width: 820,
      icon: 'error',
      title: `Nota rechazada ${this.escapeHtml(nota?.nc_numero || '')}`,
      html: `
        <div style="display:grid;gap:1rem;text-align:left">
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem">
            <div><small>Estado DGII</small><br><strong>${this.escapeHtml(nota?.estado_dgii || 'Rechazado')}</strong></div>
            <div><small>Track ID</small><br><strong>${this.escapeHtml(nota?.track_id || '-')}</strong></div>
          </div>
          <div><h4 style="font-size:1rem">Mensaje de DGII</h4>${listaMensajes}</div>
          <details style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:.75rem">
            <summary style="cursor:pointer;font-weight:700">Ver respuesta completa</summary>
            <pre style="margin:.75rem 0 0;max-height:300px;overflow:auto;white-space:pre-wrap;font-size:.78rem">${responseCompleto || '{}'}</pre>
          </details>
        </div>`,
      confirmButtonText: 'Cerrar',
    });
  }

  private extraerMensajesDgii(value: any): string[] {
    const mensajes: string[] = [];
    const clavesMensaje = /^(mensaje|mensajes|message|messages|error|errors|detalle|detail|descripcion|description|motivo)$/i;
    const visitar = (actual: any, clave = ''): void => {
      if (actual === null || actual === undefined) return;
      if (typeof actual === 'string' || typeof actual === 'number') {
        const texto = String(actual).trim();
        if (texto && clavesMensaje.test(clave) && !mensajes.includes(texto)) mensajes.push(texto);
        return;
      }
      if (Array.isArray(actual)) {
        actual.forEach((item) => visitar(item, clave));
        return;
      }
      if (typeof actual === 'object') {
        Object.entries(actual).forEach(([key, nested]) => visitar(nested, key));
      }
    };
    visitar(value);
    return mensajes;
  }

  private escapeHtml(value: any): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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
    const taxableBase18 = this.round(
      this.lines
        .filter((line) => this.round(Number(line.taxRate || 0), 2) === 18)
        .reduce((sum, line) => sum + line.amount, 0),
      2,
    );
    const tax18 = this.round(
      this.lines
        .filter((line) => this.round(Number(line.taxRate || 0), 2) === 18)
        .reduce((sum, line) => sum + line.taxAmount, 0),
      2,
    );

    const scenario: any = {
      Version: '1.0',
      TipoeCF: '34',
      ENCF: this.form.encf.trim(),
      FechaVencimientoSecuencia: this.formatDgiiDate(this.form.sequenceExpiration),
      IndicadorMontoGravado: this.taxTotal > 0 ? '1' : '0',
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
      MontoGravadoI1: taxableBase18 > 0 ? taxableBase18.toFixed(2) : '',
      ITBIS1: taxableBase18 > 0 ? '18' : '',
      TotalITBIS: this.taxTotal.toFixed(2),
      TotalITBIS1: tax18 > 0 ? tax18.toFixed(2) : '',
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
