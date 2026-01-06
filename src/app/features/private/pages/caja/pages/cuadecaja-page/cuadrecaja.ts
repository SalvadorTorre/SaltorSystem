
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
    this.facturaService.buscarTodasFacturacion().subscribe({
      next: (res: any) => {
        this.isLoading = false;
        const todas = res.data || [];
        console.log('Facturas cargadas:', todas.length > 0 ? todas[0] : 'No hay facturas');
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

    // Lógica principal: traer TODAS las facturas con código mayor a la última cuadrada,
    // sin importar la fecha
    let facturasCandidatas = this.facturas;

    if (this.ultimaFacturaCuadrada) {
      const last = Number(this.ultimaFacturaCuadrada);
      facturasCandidatas = this.facturas.filter(f => {
        const cod = Number(f.fa_codFact);
        if (!isNaN(last) && !isNaN(cod)) {
          return cod > last;
        }
        return String(f.fa_codFact) > String(this.ultimaFacturaCuadrada);
      });
    }

    if (facturasCandidatas.length > 0) {
      // Ordenamos por código para mostrar un rango coherente
      const ordenadas = [...facturasCandidatas].sort((a, b) => String(a.fa_codFact).localeCompare(String(b.fa_codFact)));
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
      total: 0
    };

    this.facturasFiltradas.forEach(f => {
      const monto = Number(f.fa_valFact) || 0;
      // Usar la descripción completa (ej: "2 - Tarjeta") para buscar palabras clave
      const metodo = this.obtenerDescripcionPago(f.fa_fpago).toLowerCase();

      if (metodo.includes('efectivo') || metodo.includes('contado')) {
        this.totales.efectivo += monto;
      } else if (metodo.includes('tarjeta') || metodo.includes('t/c')) {
        this.totales.tarjeta += monto;
      } else if (metodo.includes('credito')) {
        this.totales.credito += monto;
      } else if (metodo.includes('deposito') || metodo.includes('transferencia')) {
        this.totales.deposito += monto;
      } else if (metodo.includes('cheque')) {
        this.totales.cheque += monto;
      } else {
        // Por defecto, si no se reconoce, se suma a efectivo (comportamiento legacy)
        // Opcionalmente podríamos tener un 'otros', pero por ahora mantenemos esto.
        this.totales.efectivo += monto; 
      }
    });

    this.totales.total = this.totales.efectivo + this.totales.tarjeta + this.totales.credito + this.totales.deposito + this.totales.cheque;
  }

  generarReporte() {
    const builder = new ReporteCierreBuilder();
    builder.iniciarDocumento('Cierre de Caja')
           .agregarDatosGenerales(`Desde Factura ${this.inicioFactura} hasta ${this.finFactura}`, `Última Cuadrada: ${this.ultimaFacturaCuadrada || 'Ninguna'}`)
           .agregarTotales(this.totales, this.formatoMoneda)
           .agregarTablaDetalle(this.facturasFiltradas, this.formatoMoneda, (cod) => this.obtenerDescripcionPago(cod))
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

    const ultimaDeEsteCierre = this.facturasFiltradas[this.facturasFiltradas.length - 1].fa_codFact;

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
            factfin: ultimaDeEsteCierre, // Guardamos la última factura procesada
            montocierre: this.totales.total,
            efectivo: this.totales.efectivo,
            tarjeta: this.totales.tarjeta,
            cheque: this.totales.cheque,
            deposito: this.totales.deposito,
            nota: 'Cierre generado desde frontend'
        };

        this.cierreService.crearCierre(dataCierre).subscribe({
            next: (res: any) => {
                Swal.fire('Cerrado!', 'La caja ha sido cerrada correctamente.', 'success');
                this.generarReporte();
                this.obtenerUltimoCierreYFacturas(); 
            },
            error: (err: any) => {
                console.error(err);
                Swal.fire('Error', 'No se pudo registrar el cierre en base de datos', 'error');
            }
        });
      }
    });
  }
}
