
import { Component, OnInit } from '@angular/core';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { ServicioCierreCaja } from 'src/app/core/services/caja/cierrecaja/cierrecaja.service';
import { ServicioFpago } from 'src/app/core/services/mantenimientos/fpago/fpago.service';
import Swal from 'sweetalert2';
import { ReporteCierreBuilder } from './reporte-builder';
import { firstValueFrom } from 'rxjs';
import { PrintingService } from 'src/app/core/services/utils/printing.service';

@Component({
  selector: 'app-cuadrecaja',
  templateUrl: './cuadrecaja.html',
  styleUrls: ['./cuadrecaja.css']
})
export class CuadreCaja implements OnInit {
  facturas: any[] = [];
  facturasFiltradas: any[] = [];
  facturasResumen: any[] = [];
  private readonly tamanoLote = 200;
  totalFacturas = 0;
  totalFacturasPendientesSucursal: number | null = null;
  ultimaFacturaCuadrada: string = ''; 
  isLoading: boolean = false;
  formasPago: any[] = [];
  
  // Filtros
  inicioFactura: string = '';
  finFactura: string = '';
  // fechaInicio: string = '';
  // fechaFin: string = '';

  totales = {
    efectivo: 0,
    tarjeta: 0,
    credito: 0,
    deposito: 0,
    cheque: 0,
    pendiente: 0,
    valoresCobrados: 0,
    valoresNoCobrados: 0,
    total: 0
  };

  constructor(
    private facturaService: ServicioFacturacion,
    private cierreService: ServicioCierreCaja,
    private fpagoService: ServicioFpago,
    private printingService: PrintingService,
  ) { }

  ngOnInit(): void {
    console.log('CuadreCaja Component Initialized - Version Updated');
    this.cargarFormasPago();
    this.obtenerUltimoCierreYFacturas();
  }

  cargarFormasPago() {
    this.fpagoService.obtenerTodosFpago().subscribe({
      next: (res: any) => {
        console.log('Formas de pago cargadas:', res.data);
        this.formasPago = res.data || [];
      },
      error: (err: any) => {
        console.error('Error cargando formas de pago', err);
      }
    });
  }

  obtenerDescripcionPago(codigo: string): string {
    if (!codigo) return '';
    // Normalizar a string para comparación
    const codigoStr = String(codigo).trim();
    
    // Buscar coincidencia exacta por ID o descripción
    const pago = this.formasPago.find(p => 
        String(p.fp_codfpago) === codigoStr || 
        p.fp_descfpago.toLowerCase() === codigoStr.toLowerCase()
    );

    if (pago) {
        return `${pago.fp_codfpago} - ${pago.fp_descfpago}`;
    }
    
    // Debug si no encuentra match
    // console.warn(`No se encontró forma de pago para código: ${codigoStr}`, this.formasPago);
    return codigo; 
  }

  facturaEstaPagada(factura: any): boolean {
    const estadoPago = String(factura?.fa_fpago || '').trim().toUpperCase();
    return ['S', 'P', 'PAGADA', 'COBRADA'].includes(estadoPago);
  }

  obtenerFormaPagoVisible(factura: any): string {
    if (this.esCreditoPendiente(factura)) return 'Crédito';
    if (!this.facturaEstaPagada(factura)) return '';
    return this.obtenerDescripcionPago(factura.fa_codfpago || factura.fa_fpago);
  }

  obtenerCodigoPagoVisible(factura: any): string {
    if (this.esFacturaCredito(factura)) return 'C';
    if (!this.facturaEstaPagada(factura)) return 'P';
    return String(factura?.fa_codfpago ?? '').trim();
  }

  esFacturaCredito(factura: any): boolean {
    const tipoVenta = Number(factura?.fa_tipopago ?? 1);
    if (tipoVenta === 2) {
      return true;
    }

    if (Number(factura?.fa_codfpago) === 3) {
      return false;
    }

    const descripcion = this.obtenerDescripcionPago(factura?.fa_codfpago || factura?.fa_fpago)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return descripcion.includes('credito');
  }

  esCreditoPendiente(factura: any): boolean {
    return !this.facturaEstaPagada(factura) && this.esFacturaCredito(factura);
  }

  facturaTieneCierre(factura: any): boolean {
    const cierre = String(factura?.fa_cierre || '').trim().toUpperCase();
    return cierre !== '' && cierre !== 'N' && cierre !== 'PENDIENTE';
  }

  esFacturaAntigua(factura: any): boolean {
    if (!this.ultimaFacturaCuadrada) return false;
    
    const numFact = Number(factura.fa_codFact);
    const numUltima = Number(this.ultimaFacturaCuadrada);

    if (!isNaN(numFact) && !isNaN(numUltima)) {
        return numFact <= numUltima;
    }
    
    // Fallback lexicográfico si no son números
    return String(factura.fa_codFact).localeCompare(String(this.ultimaFacturaCuadrada)) <= 0;
  }

  obtenerEtiquetaPago(factura: any): string {
    if (this.esCreditoPendiente(factura)) {
        return 'CREDITO';
    }
    if (this.facturaEstaPagada(factura)) {
        return 'COBRADA';
    }

    return 'Pendiente Pago';
    
    // 1. Si es crédito (no pagada), SIEMPRE es PENDIENTE (sea antigua o nueva)

    // 2. Si es antigua y NO es crédito (ya pasó el check arriba), entonces está COBRADA
    
    // 3. Si es actual y pagada, dejar en blanco
  }

  obtenerTipoFactura(factura: any): string {
    return String(factura?.fa_status || '').trim().toUpperCase() === 'C'
      ? 'Conduce'
      : 'Factura';
  }

  obtenerClaseTipoFactura(factura: any): string {
    return this.obtenerTipoFactura(factura) === 'Conduce'
      ? 'bg-warning text-dark'
      : 'bg-success';
  }

  obtenerUltimoCierreYFacturas() {
    this.isLoading = true;
    
    // 1. Obtener último cierre para saber desde qué factura empezar
    this.cierreService.obtenerUltimoCierre(this.sucursalUsuarioActual()).subscribe({
      next: (res: any) => {
        const cierres = Array.isArray(res?.data) ? res.data : [];
        // Asumiendo que vienen ordenados desc por backend, el [0] es el último
        if (cierres.length > 0) {
          this.ultimaFacturaCuadrada = cierres[0].factfin || '';
        } else {
          this.ultimaFacturaCuadrada = '';
        }
        // 2. Cargar facturas
        this.cargarFacturasPendientes();
      },
      error: (err: any) => {
        console.error('Error obteniendo último cierre', err);
        // Si falla, procedemos a cargar facturas sin filtro de última (o desde el inicio)
        this.cargarFacturasPendientes();
      }
    });
  }

  async cargarFacturasPendientes() {
    this.isLoading = true;
    const sucursal = this.sucursalUsuarioActual();
    try {
      this.facturas = await this.cargarDetalleCompleto();
      this.totalFacturas = this.facturas.length;
      // La misma lista completa sirve para el resumen. Así evitamos ejecutar
      // una segunda RPC que puede no estar instalada en Supabase.
      this.facturasResumen = [...this.facturas];
      this.totalFacturasPendientesSucursal = this.facturas.length;
      this.aplicarFiltros();
      this.calcularTotales();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudieron cargar las facturas', 'error');
    } finally {
      this.isLoading = false;
    }

    if (this.totalFacturasPendientesSucursal === null) {
      this.facturaService.buscarResumenTotalesFacturasPendientesCierre(true, sucursal).subscribe({
        next: (res: any) => {
          const resumen = res.data || {};
          this.facturasResumen = [];
          this.totalFacturasPendientesSucursal = Number(resumen.cantidad) || 0;
          this.totalFacturas = this.totalFacturasPendientesSucursal;
          this.inicioFactura = resumen.inicioFactura || '';
          this.finFactura = resumen.finFactura || '';
          this.totales = {
            efectivo: Number(resumen.efectivo) || 0,
            tarjeta: Number(resumen.tarjeta) || 0,
            credito: Number(resumen.credito) || 0,
            deposito: Number(resumen.deposito) || 0,
            cheque: Number(resumen.cheque) || 0,
            pendiente: Number(resumen.pendiente) || 0,
            valoresCobrados: Number(resumen.valoresCobrados) || 0,
            valoresNoCobrados: Number(resumen.valoresNoCobrados) || 0,
            total: Number(resumen.total) || 0,
          };
        },
        error: (err: any) => console.error('Error cargando resumen de cierre', err),
      });
    }
  }

  cantidadFacturasPendientesVisible(): number {
    return this.totalFacturasPendientesSucursal ?? this.totalFacturas;
  }

  private actualizarRangoYTotales(): void {
    const ordenadas = [...this.facturasResumen].sort((a, b) => Number(a.fa_codFact) - Number(b.fa_codFact));
    this.inicioFactura = ordenadas[0]?.fa_codFact || '';
    this.finFactura = ordenadas[ordenadas.length - 1]?.fa_codFact || '';
    this.calcularTotales();
  }

  aplicarFiltros() {
    if (!this.facturas.length) return;

    // Lógica actualizada: 
    // Incluir facturas posteriores al último cierre O facturas anteriores que NO estén cerradas (fa_cierre != 'C')
    // Simplificación: Traer todas las facturas que no tengan fa_cierre == 'C'
    
    let facturasCandidatas = this.facturas.filter(f => {
       const status = String(f?.fa_status || '').trim().toUpperCase();
       if (status === 'N') return false;
       return !this.facturaTieneCierre(f);
    });

    if (facturasCandidatas.length > 0) {
      // Ordenamos por código numéricamente para consistencia
      const ordenadas = [...facturasCandidatas].sort((a, b) => {
          const numA = Number(a.fa_codFact);
          const numB = Number(b.fa_codFact);
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }
          return String(a.fa_codFact).localeCompare(String(b.fa_codFact));
      });

      this.inicioFactura = ordenadas[0].fa_codFact;
      this.finFactura = ordenadas[ordenadas.length - 1].fa_codFact;
      this.facturasFiltradas = ordenadas;
    } else {
      this.facturasFiltradas = [];
    }

    if (this.facturasResumen.length === 0) this.calcularTotales();
  }

  calcularTotales() {
    this.totales = {
      efectivo: 0,
      tarjeta: 0,
      credito: 0,
      deposito: 0,
      cheque: 0,
      pendiente: 0,
      valoresCobrados: 0,
      valoresNoCobrados: 0,
      total: 0
    };

    const facturasParaTotales = this.facturasResumen.length ? this.facturasResumen : this.facturasFiltradas;
    facturasParaTotales.forEach(f => {
      const monto = Number(f.fa_valFact) || 0;
      const codigoFormaPago = Number(f.fa_codfpago);

      if (this.facturaEstaPagada(f)) {
        this.totales.valoresCobrados += monto;
      } else {
        this.totales.valoresNoCobrados += monto;
      }

      if (codigoFormaPago === 3) {
        if (this.facturaEstaPagada(f)) {
          this.totales.tarjeta += monto;
        } else {
          this.totales.pendiente += monto;
        }
        return;
      }

      if (this.esCreditoPendiente(f)) {
        this.totales.credito += monto;
        return;
      }

      if (!this.facturaEstaPagada(f)) {
        this.totales.pendiente += monto;
        return;
      }

      // Usamos fa_codfpago preferiblemente para identificar el método, fallback a fa_fpago
      const codigoPago = f.fa_codfpago || f.fa_fpago;
      const metodo = this.obtenerDescripcionPago(codigoPago).toLowerCase();

      if (metodo.includes('efectivo') || metodo.includes('contado')) {
        this.totales.efectivo += monto;
      } else if (metodo.includes('credito')) {
        this.totales.credito += monto;
      } else if (metodo.includes('deposito') || metodo.includes('transferencia')) {
        this.totales.deposito += monto;
      } else if (metodo.includes('cheque')) {
        this.totales.cheque += monto;
      } else {
        // Por defecto, si no se reconoce, se suma a efectivo
        this.totales.efectivo += monto; 
      }
    });

    this.totales.total = this.totales.valoresCobrados + this.totales.valoresNoCobrados;
  }

  private async cargarDetalleCompleto(): Promise<any[]> {
    const res: any = await firstValueFrom(
      this.facturaService.buscarResumenFacturasPendientesCierre(
        true,
        this.sucursalUsuarioActual(),
      ),
    );
    return Array.isArray(res?.data) ? res.data : [];
  }

  async generarReporte(facturasReporte?: any[]) {
    this.isLoading = true;
    let detalleCompleto = facturasReporte || [];
    try {
      if (!facturasReporte) detalleCompleto = await this.cargarDetalleCompleto();
    } catch (err) {
      console.error('Error cargando el detalle completo del reporte', err);
      Swal.fire('Error', 'No se pudo cargar el detalle completo para generar el PDF.', 'error');
      return;
    } finally {
      this.isLoading = false;
    }

    const builder = new ReporteCierreBuilder();
    const nombreEmpresa = String(localStorage.getItem('nombre_empresa') || '').trim();
    builder.iniciarDocumento('Cierre de Caja', nombreEmpresa)
           .agregarDatosGenerales(`Desde Factura ${this.inicioFactura} hasta ${this.finFactura}`, `Última Cuadrada: ${this.ultimaFacturaCuadrada || 'Ninguna'}`)
           .agregarTotales(this.totales, this.formatoMoneda)
           .agregarTablaDetalle(detalleCompleto, this.formatoMoneda, (factura) => this.obtenerCodigoPagoVisible(factura))
           .agregarLeyendaFormasPago(this.formasPago)
           .agregarFirma()
           .build(this.nombreArchivoCierre());
  }

  private nombreArchivoCierre(fecha: Date = new Date()): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const ano = String(fecha.getFullYear());
    const base = `cierre${mes}${dia}${ano}`;
    const storageKey = `cuadrecaja_pdf_${base}`;
    const contadorActual = Number(localStorage.getItem(storageKey) || '0');
    const nombre = contadorActual === 0
      ? `${base}.pdf`
      : `${base}-${contadorActual}.pdf`;

    localStorage.setItem(storageKey, String(contadorActual + 1));
    return nombre;
  }

  formatoMoneda(valor: number): string {
    return new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
  }

  sucursalUsuarioActual(): number | null {
    const id = Number(localStorage.getItem('idSucursal') || 0);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private obtenerNombreSucursal(): string {
    try {
      const raw = localStorage.getItem('sucursal');
      const sucursal = raw ? JSON.parse(raw) : null;
      return String(
        sucursal?.nom_sucursal || sucursal?.descripcion || sucursal?.nombre ||
        `Sucursal ${this.sucursalUsuarioActual() || ''}`,
      ).trim();
    } catch {
      return `Sucursal ${this.sucursalUsuarioActual() || ''}`.trim();
    }
  }

  private escapeHtml(value: any): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private detalleModalCierre(datos: { primera: string; ultima: string; cantidad: number; cantidadCobradas: number }): string {
    const fila = (titulo: string, valor: string) => `
      <div style="display:flex;justify-content:space-between;gap:16px;padding:5px 0;border-bottom:1px solid #edf1f5;">
        <span style="color:#64748b;">${this.escapeHtml(titulo)}</span>
        <strong style="text-align:right;">${this.escapeHtml(valor)}</strong>
      </div>`;
    const dinero = (valor: number) => `RD$${this.formatoMoneda(Number(valor) || 0)}`;

    return `
      <div style="text-align:left;font-size:14px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 22px;margin-bottom:12px;">
          <div>
            ${fila('Empresa', localStorage.getItem('nombre_empresa') || '-')}
            ${fila('Sucursal', this.obtenerNombreSucursal())}
            ${fila('Código sucursal', String(this.sucursalUsuarioActual() || '-'))}
            ${fila('Cajero', localStorage.getItem('nombreusuario') || '-')}
          </div>
          <div>
            ${fila('Fecha', new Date().toLocaleString('es-DO'))}
            ${fila('Factura inicial', datos.primera || '-')}
            ${fila('Factura final', datos.ultima || '-')}
            ${fila('Facturas', String(datos.cantidad))}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 22px;margin-bottom:14px;">
          <div>
            ${fila('Efectivo', dinero(this.totales.efectivo))}
            ${fila('Tarjetas', dinero(this.totales.tarjeta))}
            ${fila('Depósito/transferencia', dinero(this.totales.deposito))}
            ${fila('Cheques', dinero(this.totales.cheque))}
          </div>
          <div>
            ${fila('Crédito pendiente', dinero(this.totales.credito))}
            ${fila('Pendiente de pago', dinero(this.totales.pendiente))}
            ${fila('Valores cobrados', dinero(this.totales.valoresCobrados))}
            ${fila('Valores no cobrados', dinero(this.totales.valoresNoCobrados))}
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;padding:10px;background:#eef6ff;border-radius:6px;font-size:17px;">
          <strong>TOTAL DEL CIERRE</strong><strong>${this.escapeHtml(dinero(this.totales.total))}</strong>
        </div>
        <div style="margin-top:12px;color:#475569;">Se marcarán ${datos.cantidadCobradas} facturas cobradas.</div>
        <label for="nota-cierre" style="display:block;margin-top:14px;font-weight:700;">Nota del cierre</label>
        <textarea id="nota-cierre" class="swal2-textarea" maxlength="255" placeholder="Escriba una nota (opcional)" style="width:100%;margin:6px 0 0;resize:vertical;"></textarea>
        <div style="text-align:right;color:#64748b;font-size:12px;">Máximo 255 caracteres</div>
      </div>`;
  }

  private construirTicketCierre(cierre: any): string {
    const valor = (numero: any) => this.formatoMoneda(Number(numero) || 0);
    const linea = (titulo: string, numero: any) => `
      <div class="row"><span>${this.escapeHtml(titulo)}</span><strong>${this.escapeHtml(valor(numero))}</strong></div>`;
    const nota = String(cierre?.nota || '').trim();

    return `<!doctype html><html><head><meta charset="utf-8"><title>Cierre de caja</title>
      <style>
        @page { size: 80mm auto; margin: 3mm; }
        * { box-sizing: border-box; }
        body { width: 74mm; margin: 0; color: #000; font-family: Arial, sans-serif; font-size: 11px; }
        h1 { margin: 0; text-align: center; font-size: 15px; }
        h2 { margin: 3px 0 8px; text-align: center; font-size: 13px; }
        .center { text-align: center; }
        .sep { border-top: 1px dashed #000; margin: 7px 0; }
        .row { display: flex; justify-content: space-between; gap: 8px; padding: 2px 0; }
        .row strong { text-align: right; }
        .total { font-size: 14px; font-weight: 700; }
        .nota { white-space: pre-wrap; overflow-wrap: anywhere; }
        .firma { margin-top: 28px; border-top: 1px solid #000; padding-top: 3px; text-align: center; }
      </style></head><body>
        <h1>${this.escapeHtml(localStorage.getItem('nombre_empresa') || '')}</h1>
        <h2>CIERRE DE CAJA</h2>
        <div class="center">${this.escapeHtml(this.obtenerNombreSucursal())}</div>
        <div class="sep"></div>
        <div class="row"><span>Cierre:</span><strong>${this.escapeHtml(cierre?.idcierre || '')}</strong></div>
        <div class="row"><span>Fecha:</span><strong>${this.escapeHtml(new Date().toLocaleString('es-DO'))}</strong></div>
        <div class="row"><span>Cajero:</span><strong>${this.escapeHtml(cierre?.cajera || '')}</strong></div>
        <div class="row"><span>Sucursal:</span><strong>${this.escapeHtml(cierre?.codsucursal || '')}</strong></div>
        <div class="row"><span>Factura inicial:</span><strong>${this.escapeHtml(cierre?.factini || '')}</strong></div>
        <div class="row"><span>Factura final:</span><strong>${this.escapeHtml(cierre?.factfin || '')}</strong></div>
        <div class="row"><span>Cant. facturas:</span><strong>${this.escapeHtml(cierre?.cantidadFacturas || 0)}</strong></div>
        <div class="sep"></div>
        ${linea('Efectivo', cierre?.tefectivo)}
        ${linea('Tarjetas', cierre?.ttarjeta)}
        ${linea('Depósito/Transf.', cierre?.tdeposito)}
        ${linea('Cheques', cierre?.tcheque)}
        ${linea('Crédito pendiente', cierre?.credito)}
        ${linea('Pendiente de pago', cierre?.pendiente)}
        ${linea('Total cobrado', cierre?.valoresCobrados)}
        ${linea('Total no cobrado', cierre?.valoresNoCobrados)}
        <div class="sep"></div>
        <div class="row total"><span>TOTAL:</span><strong>${this.escapeHtml(valor(cierre?.totalcierre))}</strong></div>
        ${nota ? `<div class="sep"></div><strong>NOTA:</strong><div class="nota">${this.escapeHtml(nota)}</div>` : ''}
        <div class="firma">Firma del cajero</div>
      </body></html>`;
  }

  async realizarCierre() {
    if (this.cantidadFacturasPendientesVisible() === 0) {
      Swal.fire('Atención', 'No hay facturas para cerrar en este periodo.', 'warning');
      return;
    }

    let detalleCompleto: any[];
    this.isLoading = true;
    try {
      detalleCompleto = await this.cargarDetalleCompleto();
    } catch (err) {
      this.isLoading = false;
      console.error('Error preparando el detalle del cierre', err);
      Swal.fire('Error', 'No se pudo cargar el detalle completo para cerrar la caja.', 'error');
      return;
    }
    this.isLoading = false;

    const facturasDelCierre = detalleCompleto;
    const primeraDeEsteCierre = facturasDelCierre[0]?.fa_codFact || this.inicioFactura;
    const ultimaDeEsteCierre = facturasDelCierre[facturasDelCierre.length - 1]?.fa_codFact || this.finFactura;
    const codigosFacturasCierre = facturasDelCierre
      .filter(f => String(f?.fa_fpago || '').trim().toUpperCase() === 'S')
      .map(f => String(f.fa_codFact || '').trim())
      .filter(Boolean);

    const confirmacion = await Swal.fire({
      title: 'Confirmar cierre de caja',
      html: this.detalleModalCierre({
        primera: String(primeraDeEsteCierre || ''),
        ultima: String(ultimaDeEsteCierre || ''),
        cantidad: facturasDelCierre.length,
        cantidadCobradas: codigosFacturasCierre.length,
      }),
      icon: 'warning',
      width: 760,
      showCancelButton: true,
      confirmButtonText: '<i class="fas fa-print"></i> Confirmar e imprimir 80 mm',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      preConfirm: () => {
        const textarea = document.getElementById('nota-cierre') as HTMLTextAreaElement | null;
        return String(textarea?.value || '').trim().slice(0, 255);
      },
    });

    if (!confirmacion.isConfirmed) return;

    const notaCierre = String(confirmacion.value || '').trim();
    const dataCierre = {
      feccierre: new Date().toISOString(),
      factini: String(primeraDeEsteCierre || '').trim(),
      factfin: String(ultimaDeEsteCierre || '').trim(),
      montocierre: this.totales.total,
      efectivo: this.totales.efectivo,
      tarjeta: this.totales.tarjeta,
      cheque: this.totales.cheque,
      deposito: this.totales.deposito,
      codsucursal: this.sucursalUsuarioActual(),
      nota: notaCierre || null,
    };

    this.isLoading = true;
    try {
      const res: any = await firstValueFrom(this.cierreService.crearCierre(dataCierre));
      const idCierre = res?.data?.idcierre || res?.idcierre;
      if (!idCierre) {
        throw new Error('El cierre fue creado, pero Supabase no devolvió su número.');
      }

      const resp: any = await firstValueFrom(
        this.facturaService.confirmarCierreFacturas(idCierre, codigosFacturasCierre, {
          sucursal: this.sucursalUsuarioActual(),
        }),
      );
      const actualizadas = Number(resp?.data?.updated || 0);
      if (actualizadas !== codigosFacturasCierre.length) {
        await Swal.fire(
          'Cierre incompleto',
          `Se marcaron ${actualizadas} de ${codigosFacturasCierre.length} facturas. Revise que todas pertenezcan a la sucursal activa y sigan pendientes de cierre.`,
          'warning',
        );
        return;
      }

      const cierreImpresion = {
        ...(res?.data || dataCierre),
        idcierre: idCierre,
        cantidadFacturas: facturasDelCierre.length,
        credito: this.totales.credito,
        pendiente: this.totales.pendiente,
        valoresCobrados: this.totales.valoresCobrados,
        valoresNoCobrados: this.totales.valoresNoCobrados,
        nota: notaCierre,
      };

      try {
        await this.printingService.printHtmlContent(this.construirTicketCierre(cierreImpresion), 'ticket');
        await Swal.fire('Cerrado', 'El cierre y la nota se guardaron y se enviaron a impresión.', 'success');
      } catch (printError: any) {
        console.error('Error imprimiendo cierre', printError);
        await Swal.fire(
          'Cierre guardado',
          printError?.message || 'El cierre y la nota se guardaron, pero no se pudo abrir la impresión.',
          'warning',
        );
      }

      await this.generarReporte(detalleCompleto);
      this.obtenerUltimoCierreYFacturas();
    } catch (err: any) {
      console.error('Error realizando cierre', err);
      const detalle = err?.message || err?.details || err?.hint || 'No se pudo registrar el cierre en base de datos';
      await Swal.fire('Error', detalle, 'error');
    } finally {
      this.isLoading = false;
    }
  }
}
