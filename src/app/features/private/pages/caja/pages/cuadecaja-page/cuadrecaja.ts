
import { Component, OnInit } from '@angular/core';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { ServicioCierreCaja } from 'src/app/core/services/caja/cierrecaja/cierrecaja.service';
import { ServicioFpago } from 'src/app/core/services/mantenimientos/fpago/fpago.service';
import Swal from 'sweetalert2';
import { ReporteCierreBuilder } from './reporte-builder';


@Component({
  selector: 'app-cuadrecaja',
  templateUrl: './cuadrecaja.html',
  styleUrls: ['./cuadrecaja.css']
})
export class CuadreCaja implements OnInit {
  facturas: any[] = [];
  facturasFiltradas: any[] = [];
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
    total: 0
  };

  constructor(
    private facturaService: ServicioFacturacion,
    private cierreService: ServicioCierreCaja,
    private fpagoService: ServicioFpago
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
    if (!this.facturaEstaPagada(factura)) return '';
    return this.obtenerDescripcionPago(factura.fa_codfpago || factura.fa_fpago);
  }

  obtenerCodigoPagoVisible(factura: any): string {
    if (!this.facturaEstaPagada(factura)) return '';
    return String(factura?.fa_codfpago ?? '').trim();
  }

  esFacturaCredito(factura: any): boolean {
    if (Number(factura?.fa_codfpago) === 3) {
      return false;
    }

    const descripcion = this.obtenerDescripcionPago(factura?.fa_codfpago || factura?.fa_fpago)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return descripcion.includes('credito');
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
    if (this.esFacturaCredito(factura)) {
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
    this.cierreService.obtenerUltimoCierre().subscribe({
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

  cargarFacturasPendientes() {
    // Usamos el nuevo método específico para cierre que trae un histórico amplio (10000)
    // usando el endpoint /facturacion que sabemos devuelve lista general.
    this.facturaService.buscarFacturasParaCierre().subscribe({
      next: (res: any) => {
        this.isLoading = false;
        const todas = res.data || [];
        console.log('Facturas cargadas para cierre (limit 10000):', todas.length);
        this.facturas = todas; 
        this.aplicarFiltros();
      },
      error: (err: any) => {
        this.isLoading = false;
        console.error(err);
        Swal.fire('Error', 'No se pudieron cargar las facturas', 'error');
      }
    });
  }

  aplicarFiltros() {
    if (!this.facturas.length) return;

    // Lógica actualizada: 
    // Incluir facturas posteriores al último cierre O facturas anteriores que NO estén cerradas (fa_cierre != 'C')
    // Simplificación: Traer todas las facturas que no tengan fa_cierre == 'C'
    
    let facturasCandidatas = this.facturas.filter(f => {
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

    this.calcularTotales();
  }

  calcularTotales() {
    this.totales = {
      efectivo: 0,
      tarjeta: 0,
      credito: 0,
      deposito: 0,
      cheque: 0,
      pendiente: 0,
      total: 0
    };

    this.facturasFiltradas.forEach(f => {
      const monto = Number(f.fa_valFact) || 0;
      const codigoFormaPago = Number(f.fa_codfpago);

      if (codigoFormaPago === 3) {
        if (this.facturaEstaPagada(f)) {
          this.totales.tarjeta += monto;
        } else {
          this.totales.pendiente += monto;
        }
        return;
      }

      if (this.esFacturaCredito(f)) {
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

    this.totales.total = this.totales.efectivo + this.totales.tarjeta + this.totales.credito + this.totales.deposito + this.totales.cheque;
  }

  generarReporte() {
    const builder = new ReporteCierreBuilder();
    const nombreEmpresa = String(localStorage.getItem('nombre_empresa') || '').trim();
    builder.iniciarDocumento('Cierre de Caja', nombreEmpresa)
           .agregarDatosGenerales(`Desde Factura ${this.inicioFactura} hasta ${this.finFactura}`, `Última Cuadrada: ${this.ultimaFacturaCuadrada || 'Ninguna'}`)
           .agregarTotales(this.totales, this.formatoMoneda)
           .agregarTablaDetalle(this.facturasFiltradas, this.formatoMoneda, (factura) => this.obtenerCodigoPagoVisible(factura))
           .agregarLeyendaFormasPago(this.formasPago)
           .agregarFirma()
           .build('cierre_caja.pdf');
  }

  formatoMoneda(valor: number): string {
    return new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
  }

  realizarCierre() {
    if (this.facturasFiltradas.length === 0) {
        Swal.fire('Atención', 'No hay facturas para cerrar en este periodo.', 'warning');
        return;
    }

    const primeraDeEsteCierre = this.facturasFiltradas[0]?.fa_codFact;
    const ultimaDeEsteCierre = this.facturasFiltradas[this.facturasFiltradas.length - 1].fa_codFact;
    const facturasCobradas = this.facturasFiltradas.filter(f => this.facturaEstaPagada(f) || this.esFacturaCredito(f));
    const codigosFacturasCobradas = facturasCobradas
      .map(f => String(f.fa_codFact || '').trim())
      .filter(Boolean);

    Swal.fire({
      title: '¿Confirmar Cierre de Caja?',
      text: `Se cerrará hasta la factura ${ultimaDeEsteCierre}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar caja'
    }).then((result) => {
      if (result.isConfirmed) {
        const dataCierre = {
            feccierre: new Date().toISOString(),
            factini: String(primeraDeEsteCierre || '').trim(),
            factfin: String(ultimaDeEsteCierre || '').trim(), // Guardamos la última factura procesada, forzando String
            montocierre: this.totales.total,
            efectivo: this.totales.efectivo,
            tarjeta: this.totales.tarjeta,
            cheque: this.totales.cheque,
            deposito: this.totales.deposito,
            nota: 'Cierre generado desde frontend'
        };

        this.cierreService.crearCierre(dataCierre).subscribe({
                    next: (res: any) => {
                        const idCierre = res?.data?.idcierre || res?.idcierre;

                        this.facturaService.confirmarCierreFacturas(idCierre, codigosFacturasCobradas).subscribe({
                          next: (resp) => {
                            console.log('Facturas cobradas actualizadas con idcierre', resp);
                            Swal.fire('Cerrado!', 'La caja ha sido cerrada correctamente.', 'success');
                            this.generarReporte();
                            this.obtenerUltimoCierreYFacturas(); 
                          },
                          error: (err) => {
                            console.error('Error actualizando facturas cierre', err);
                            const detalle = err?.message || err?.details || err?.hint || 'El cierre fue creado, pero no se pudo marcar el idcierre en las facturas cobradas.';
                            Swal.fire('Error', detalle, 'error');
                          }
                        });
                    },
                    error: (err: any) => {
                console.error(err);
                const detalle = err?.message || err?.details || err?.hint || 'No se pudo registrar el cierre en base de datos';
                Swal.fire('Error', detalle, 'error');
            }
        });
      }
    });
  }
}
