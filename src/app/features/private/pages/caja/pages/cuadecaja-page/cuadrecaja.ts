
import { Component, OnInit } from '@angular/core';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { ServicioCierreCaja } from 'src/app/core/services/caja/cierrecaja/cierrecaja.service';
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
  
  // Filtros
  fechaInicio: string = '';
  fechaFin: string = '';

  totales = {
    efectivo: 0,
    tarjeta: 0,
    deposito: 0,
    cheque: 0,
    total: 0
  };

  constructor(
    private facturaService: ServicioFacturacion,
    private cierreService: ServicioCierreCaja
  ) { }

  ngOnInit(): void {
    const hoy = new Date();
    this.fechaInicio = hoy.toISOString().split('T')[0];
    this.fechaFin = hoy.toISOString().split('T')[0];
    
    this.obtenerUltimoCierreYFacturas();
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

    // Filtro por fecha opcional (si el usuario quiere acotar más)
    const inicio = new Date(this.fechaInicio + 'T00:00:00');
    const fin = new Date(this.fechaFin + 'T23:59:59');

    // Lógica principal: Filtrar facturas posteriores a la última cuadrada
    let facturasCandidatas = this.facturas;

    if (this.ultimaFacturaCuadrada) {
      // Ordenamos cronológicamente ascendente (viejas -> nuevas)
      facturasCandidatas = this.facturas.sort((a, b) => new Date(a.fa_fecha).getTime() - new Date(b.fa_fecha).getTime());
      
      const idx = facturasCandidatas.findIndex(f => f.fa_codFact === this.ultimaFacturaCuadrada);
      if (idx !== -1) {
          // Tomamos las facturas DESPUÉS de la última cuadrada
          facturasCandidatas = facturasCandidatas.slice(idx + 1);
      }
    }

    // Aplicar filtro de fecha de UI sobre las candidatas
    this.facturasFiltradas = facturasCandidatas.filter(f => {
      const fechaFactura = new Date(f.fa_fecha);
      return fechaFactura >= inicio && fechaFactura <= fin;
    });

    this.calcularTotales();
  }

  calcularTotales() {
    this.totales = {
      efectivo: 0,
      tarjeta: 0,
      deposito: 0,
      cheque: 0,
      total: 0
    };

    this.facturasFiltradas.forEach(f => {
      const monto = Number(f.fa_total) || 0;
      const metodo = (f.fa_fpago || '').toLowerCase();

      if (metodo.includes('efectivo')) {
        this.totales.efectivo += monto;
      } else if (metodo.includes('tarjeta') || metodo.includes('credito')) {
        this.totales.tarjeta += monto;
      } else if (metodo.includes('deposito') || metodo.includes('transferencia')) {
        this.totales.deposito += monto;
      } else if (metodo.includes('cheque')) {
        this.totales.cheque += monto;
      } else {
        this.totales.efectivo += monto; 
      }
    });

    this.totales.total = this.totales.efectivo + this.totales.tarjeta + this.totales.deposito + this.totales.cheque;
  }

  generarReporte() {
    const builder = new ReporteCierreBuilder();
    builder.iniciarDocumento('Cierre de Caja')
           .agregarDatosGenerales(`${this.fechaInicio} al ${this.fechaFin}`, `Última Cuadrada: ${this.ultimaFacturaCuadrada || 'Ninguna'}`)
           .agregarTotales(this.totales, this.formatoMoneda)
           .agregarTablaDetalle(this.facturasFiltradas, this.formatoMoneda)
           .agregarFirma()
           .build('cierre_caja.pdf');
  }

  formatoMoneda(valor: number): string {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(valor);
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
