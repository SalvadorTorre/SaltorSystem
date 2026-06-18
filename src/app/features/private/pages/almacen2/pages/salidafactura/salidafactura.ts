import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ServicioUsuario } from 'src/app/core/services/mantenimientos/usuario/usuario.service';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { ServicioSalidafactura } from 'src/app/core/services/almacen/salidafactura/salidafactura.service';
import { ServicioFpago } from 'src/app/core/services/mantenimientos/fpago/fpago.service';
import { ServicioContFactura } from 'src/app/core/services/mantenimientos/contfactura/contfactura.service';
import { ServicioSucursal } from 'src/app/core/services/mantenimientos/sucursal/sucursal.service';
import Swal from 'sweetalert2';
import { Subject, Subscription, forkJoin, firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PrintingService } from 'src/app/core/services/utils/printing.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
declare var bootstrap: any;

interface DetalleSalida {
  codFact: string;
  nomClie: string;
  fecFact: string;
  valFact: number;
  codfpago: string;
  fa_status?: string;
  // Flag de pago: 'S' (pagada) / 'N' (pendiente)
  fpago: string;
}

@Component({
  selector: 'app-salidafactura',
  templateUrl: './salidafactura.html',
  styleUrls: ['./salidafactura.css']
})
export class SalidafacturaComponent implements OnInit {

  codChofer: string = '';
  nomChofer: string = '';
  cedChofer: string = '';
  bloquearChofer: boolean = false;
  codSalida: string = '';
  fechaSalida: string = new Date().toISOString();
  contFacturaActual: any;
  
  txtcodFact: string = '';
  detallesSalida: DetalleSalida[] = [];
  mapaFpagos: Map<string, string> = new Map();
  
  // Variables para el modal de búsqueda
  mostrarModalChofer: boolean = false;
  listaChoferesEncontrados: any[] = [];
  indiceChoferSeleccionado: number = 0;
  
  // Variables para control de impresión
  mostrarBotonImprimir: boolean = false;
  datosUltimaSalida: any = null;
  nombreSucursalActual: string = '';
  zonaSucursalActual: string = '';
  esEdicion: boolean = false;
  salidaPendienteId: number | null = null;

  private searchTerms = new Subject<string>();

  @ViewChild('inputFactura') inputFacturaElement!: ElementRef;

  constructor(
    private servicioUsuario: ServicioUsuario,
    private servicioFacturacion: ServicioFacturacion,
    private servicioSalida: ServicioSalidafactura,
    private servicioFpago: ServicioFpago,
    private servicioContFactura: ServicioContFactura,
    private servicioSucursal: ServicioSucursal,
    private printingService: PrintingService
  ) { }
// En el componente

private mostrarError(msg: string) {
  Swal.fire({
    title: 'Atención',
    text: msg,
    icon: 'warning',
    confirmButtonText: 'Aceptar',
    confirmButtonColor: '#d33',
  });
}

private extraerMensajeError(err: any): string {
  if (!err) return 'Error desconocido';
  const direct = typeof err === 'string' ? err : null;
  if (direct) return direct;

  const httpError = err?.error;
  if (typeof httpError === 'string' && httpError.trim()) return httpError;
  if (httpError?.message) return String(httpError.message);
  if (httpError?.error) return String(httpError.error);
  if (err?.message) return String(err.message);

  try {
    return JSON.stringify(httpError || err);
  } catch {
    return 'Error desconocido';
  }
}

private pickContFacturaRow(rows: any[], idsucursal: number): any | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const exact = rows.find((r: any) => Number(r?.idsucursal) === idsucursal);
  if (exact) return exact;
  const principal = rows.find((r: any) => r?.idsucursal === null || r?.idsucursal === undefined || Number(r?.idsucursal) === 0);
  return principal || rows[0] || null;
}
  ngOnInit(): void {
    this.obtenerNombreSucursal();
    this.generarCodSalida();
    this.cargarFpagos();
    // Event listener para navegación en el modal
    window.addEventListener('keydown', this.manejarTecladoModal.bind(this));

    // Configurar búsqueda en tiempo real
    this.searchTerms.pipe(
      debounceTime(150),
      distinctUntilChanged()
    ).subscribe(termino => {
      if (termino.trim()) {
        this.ejecutarBusquedaChofer(termino);
      } else {
        this.listaChoferesEncontrados = [];
        this.mostrarModalChofer = false;
      }
    });
  }

  ngOnDestroy() {
    window.removeEventListener('keydown', this.manejarTecladoModal.bind(this));
  }

  obtenerNombreSucursal() {
    const idSucursal = localStorage.getItem('idSucursal');
    if (idSucursal) {
      this.servicioSucursal.buscarsucursal(idSucursal).subscribe({
        next: (resp: any) => {
           // La respuesta puede variar en estructura, intentamos extraer el nombre
           const data = Array.isArray(resp?.data) ? resp.data[0] : (resp?.data || resp);
           if (data) {
             this.nombreSucursalActual = data.nom_sucursal || 'SUCURSAL PRINCIPAL';
             this.zonaSucursalActual = data.zona || ''; // Asumimos que el campo se llama 'zona' en la respuesta
           } else {
             this.nombreSucursalActual = 'SUCURSAL PRINCIPAL';
             this.zonaSucursalActual = '';
           }
        },
        error: () => {
          this.nombreSucursalActual = 'SUCURSAL PRINCIPAL';
          this.zonaSucursalActual = '';
        }
      });
    } else {
      this.nombreSucursalActual = 'SUCURSAL PRINCIPAL';
      this.zonaSucursalActual = '';
    }
  }

  async generarCodSalida() {
    const idSucursalRaw = localStorage.getItem('idSucursal');
    const idSucursal = idSucursalRaw ? Number(idSucursalRaw) : NaN;
    if (!Number.isFinite(idSucursal) || idSucursal <= 0) {
      console.warn('No se encontró idSucursal válido en localStorage');
      this.codSalida = '';
      this.contFacturaActual = null;
      return;
    }
    try {
      let rows: any[] = [];
      const resp: any = await firstValueFrom(this.servicioContFactura.buscarPorSucursal(idSucursal));
      if (Array.isArray(resp?.data)) rows = resp.data;
      else if (Array.isArray(resp)) rows = resp;

      // Fallback: si no hay registro por sucursal, intentar tomar el principal (idsucursal null/0)
      if (!rows || rows.length === 0) {
        const respAll: any = await firstValueFrom(this.servicioContFactura.obtenerTodos());
        if (Array.isArray(respAll?.data)) rows = respAll.data;
        else if (Array.isArray(respAll)) rows = respAll;
      }

      const item = this.pickContFacturaRow(rows, idSucursal);
      if (!item) {
        this.codSalida = '';
        this.contFacturaActual = null;
        return;
      }

      this.contFacturaActual = item;
      const ano = Number(item?.ano);
      const year = Number.isFinite(ano) && ano > 0 ? ano : new Date().getFullYear();
      const cont = item?.contsalida !== undefined && item?.contsalida !== null ? Number(item.contsalida) : 0;
      const proximo = (Number.isFinite(cont) ? cont : 0) + 1;
      const contadorStr = String(proximo).padStart(6, '0');
      this.codSalida = `${year}${contadorStr}`;
    } catch (err) {
      console.error('Error al obtener contfactura para salida', err);
      this.codSalida = '';
      this.contFacturaActual = null;
    }
  }

  manejarTecladoModal(e: KeyboardEvent) {
    if (!this.mostrarModalChofer) return;

    // Si el foco está en el input y presionan flechas, prevenir scroll default
    if (document.activeElement?.tagName === 'INPUT' && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
    }

    if (e.key === 'ArrowDown') {
      this.indiceChoferSeleccionado = (this.indiceChoferSeleccionado + 1) % this.listaChoferesEncontrados.length;
    } else if (e.key === 'ArrowUp') {
      this.indiceChoferSeleccionado = (this.indiceChoferSeleccionado - 1 + this.listaChoferesEncontrados.length) % this.listaChoferesEncontrados.length;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation(); // Evitar otros handlers de Enter
      if (this.listaChoferesEncontrados.length > 0) {
        this.seleccionarChofer(this.listaChoferesEncontrados[this.indiceChoferSeleccionado]);
      }
    } else if (e.key === 'Escape') {
      this.cerrarModalChofer();
    }
  }

  cargarFpagos() {
    this.servicioFpago.buscarTodosFpago(1, 100).subscribe({
      next: (resp: any) => {
        if (resp.data) {
          resp.data.forEach((fp: any) => {
            this.mapaFpagos.set(String(fp.fp_codfpago).trim(), fp.fp_descfpago);
          });
        }
      },
      error: (err) => console.error('Error cargando formas de pago', err)
    });
  }

  buscarChofer() {
    if (!this.codChofer.trim()) return;
    const termino = this.codChofer.trim();

    this.servicioUsuario.buscarUsuarioChoferPorCodigo(termino).subscribe({
      next: (resp: any) => this.procesarChoferEncontrado(resp.data),
      error: (err) => this.manejarErrorChofer(err)
    });
  }

  buscarChoferPorNombre(termino: string = this.nomChofer) {
    this.searchTerms.next(termino);
  }

  ejecutarBusquedaChofer(termino: string) {
    this.servicioUsuario.buscarUsuariosChoferes(1, 20, termino).subscribe({
      next: (resp: any) => {
        if (resp.data && resp.data.length > 0) {
          // Ordenar por nombre alfabéticamente
          this.listaChoferesEncontrados = resp.data.sort((a: any, b: any) => {
            const nombreA = (a.nomChofer || '').toLowerCase();
            const nombreB = (b.nomChofer || '').toLowerCase();
            return nombreA.localeCompare(nombreB);
          });
          
          this.indiceChoferSeleccionado = 0;
          this.mostrarModalChofer = true;
        } else {
          // No hay resultados: limpiar y cerrar modal
          this.listaChoferesEncontrados = [];
          this.mostrarModalChofer = false;
        }
      },
      error: (err) => console.error(err)
    });
  }

  cerrarModalChofer() {
    this.mostrarModalChofer = false;
    this.listaChoferesEncontrados = [];
  }

  seleccionarChofer(chofer: any) {
    this.procesarChoferEncontrado(chofer);
    this.cerrarModalChofer();
  }

  procesarChoferEncontrado(data: any) {
    if (data) {
      // Intentar obtener propiedades con varios nombres posibles
      const nombre = data.nomChofer || data.nombre || data.ch_nombre || '';
      const apellido = data.apellido || data.ch_apellido || '';
      const id = data.codChofer || data.id || data.ch_codChofer;

      // Construir nombre completo si hay apellido, sino solo nombre
      this.nomChofer = apellido ? `${nombre} ${apellido}`.trim() : nombre;
      this.codChofer = String(id);
      this.cedChofer = data.cedChofer || data.cedula || data.ch_cedula || '';
      this.bloquearChofer = true;
      
      // Consultar si hay salida pendiente (status = ' ')
      this.servicioSalida.obtenerPorChoferYStatus(this.codChofer).subscribe({
        next: (resp: any) => {
           const salidas = Array.isArray(resp) ? resp : (resp.data || []);
           if (salidas && salidas.length > 0) {
              const salida = salidas[0]; // Tomamos la primera pendiente
              this.cargarSalidaPendiente(salida);
           }
        },
        error: (err) => console.error('Error buscando salida pendiente', err)
      });
      
      setTimeout(() => {
        const input = document.getElementById('inputFactura');
        if (input) input.focus();
      }, 100);
    } else {
      this.mostrarError('Chofer no encontrado');
      this.nomChofer = '';
    }
  }

  cargarSalidaPendiente(salida: any) {
      this.esEdicion = true;
      this.salidaPendienteId = Number(salida?.id ?? salida?.idsalida ?? null);
      if (!Number.isFinite(this.salidaPendienteId as any)) this.salidaPendienteId = null;
      this.codSalida = salida.codSalida;
      this.detallesSalida = [];
      this.datosUltimaSalida = null;
      this.mostrarBotonImprimir = false;
      
      if (salida.detsalida && salida.detsalida.length > 0) {
          // Necesitamos obtener los detalles completos de las facturas
          const observables = salida.detsalida.map((d: any) => this.servicioFacturacion.getByNumero(d.codFact));
          
          forkJoin(observables).subscribe({
               next: (respuestas: any) => {
                   const listaRespuestas = respuestas as any[];
                   listaRespuestas.forEach((resp: any) => {
                       const f = resp.data;
                       if (f && !this.detallesSalida.some(x => x.codFact === f.fa_codFact)) {
                           this.detallesSalida.push({
                               codFact: f.fa_codFact,
                               nomClie: f.fa_nomClie,
                               fecFact: f.fa_fecFact,
                               valFact: Number(f.fa_valFact),
                               codfpago: String(f.fa_codfpago || '').trim(),
                               fa_status: String(f.fa_status || '').trim(),
                               fpago: f.fa_fpago
                           });
                       }
                   });
                   this.datosUltimaSalida = {
                     codSalida: this.codSalida,
                     fecSalida:
                       salida?.fecSalida ?? salida?.fecsalida ?? new Date().toISOString(),
                     horaSalida:
                       salida?.horaSalida ?? salida?.horasalida ?? new Date().toISOString(),
                     idsucursal: salida?.idsucursal ?? salida?.idSucursal ?? null,
                     codChofer:
                       salida?.codChofer ??
                       salida?.codchofer ??
                       Number(this.codChofer || 0),
                     nomChofer: salida?.nomChofer ?? salida?.nomchofer ?? this.nomChofer,
                     cedChofer: salida?.cedChofer ?? salida?.cedchofer ?? this.cedChofer,
                     canFact: this.detallesSalida.length,
                     valFact: this.totalSalida,
                     valPagado: salida?.valPagado ?? salida?.valpagado ?? 0,
                     detalles: [...this.detallesSalida],
                   };
                   this.mostrarBotonImprimir = true;
                   Swal.fire('Información', `Se encontró una salida pendiente. Se cargaron ${this.detallesSalida.length} facturas.`, 'info');
               },
               error: (err: any) => console.error('Error cargando detalles de facturas', err)
           });
      } else {
           this.datosUltimaSalida = {
             codSalida: this.codSalida,
             fecSalida:
               salida?.fecSalida ?? salida?.fecsalida ?? new Date().toISOString(),
             horaSalida:
               salida?.horaSalida ?? salida?.horasalida ?? new Date().toISOString(),
             idsucursal: salida?.idsucursal ?? salida?.idSucursal ?? null,
             codChofer:
               salida?.codChofer ?? salida?.codchofer ?? Number(this.codChofer || 0),
             nomChofer: salida?.nomChofer ?? salida?.nomchofer ?? this.nomChofer,
             cedChofer: salida?.cedChofer ?? salida?.cedchofer ?? this.cedChofer,
             canFact: 0,
             valFact: 0,
             valPagado: salida?.valPagado ?? salida?.valpagado ?? 0,
             detalles: [],
           };
           this.mostrarBotonImprimir = true;
           Swal.fire('Información', `Se encontró una salida pendiente (${this.codSalida}) sin facturas.`, 'info');
      }
  }

  manejarErrorChofer(err: any) {
    console.error(err);
    this.mostrarError('Error al buscar chofer');
  }

  cambiarChofer() {
    this.bloquearChofer = false;
    this.nomChofer = '';
    this.cedChofer = '';
    this.detallesSalida = [];
    this.codChofer = '';
    this.esEdicion = false;
    this.salidaPendienteId = null;
    setTimeout(() => document.querySelector('input')?.focus(), 100);
  }

  // agregarFactura() {
  //   const codFact = this.txtcodFact.trim();
  //   if (!codFact) return;
  //   error: (err) => {
  //    if (err.status === 404) {
  //       Swal.fire({
  //         title: 'Factura no encontrada',
  //         icon: 'warning'
  //       });
  //     }
  //   }
  //   // Verificar si ya está en la lista
  //   if (this.detallesSalida.some(d => d.codFact === codFact)) {
  //     this.mostrarError('Esta factura ya está en la lista');
  //     this.txtcodFact = '';
  //     return;
  //   }

  //   // Buscar factura y validar condiciones
  //   this.servicioFacturacion.getByNumero(codFact).subscribe({
  //     next: (resp: any) => {
  //       const factura = resp.data;
  //       if (!factura) {
  //         this.mostrarError('Factura no encontrada');
  //         return;
  //       }
  //       // Validar condiciones: fa_envio=2, fa_impresa='S', fa_salida=' '
  //       if (factura.fa_envio != 2) {
  //         this.mostrarError(`La factura ${codFact} no está marcada para envío (fa_envio != 2)`);
  //         return;
  //       }
  //       if (factura.fa_impresa !== 'S') {
  //         this.mostrarError(`La factura ${codFact} no ha sido impresa (fa_impresa != S)`);
  //         return;
  //       }
  //       if (factura.fa_salida && factura.fa_salida.trim() !== '') {
  //         this.mostrarError(`La factura ${codFact} ya tiene salida registrada`);
  //         return;
  //       }

  //       // Agregar a la lista
  //       this.detallesSalida.push({
  //         codFact: factura.fa_codFact,
  //         nomClie: factura.fa_nomClie,
  //         fecFact: factura.fa_fecFact,
  //         valFact: Number(factura.fa_valFact),
  //         codfpago: String(factura.fa_codfpago || '').trim(),
  //         fpago: factura.fa_fpago
  //       });

  //       this.txtcodFact = ''; // Limpiar input
  //     },
  //     error: (err) => {
  //       console.error(err);
  //       this.mostrarError('Error al buscar la factura');
  //     }
  //   });
  // }
// agregarFactura() {
//   const codFact = this.txtcodFact.trim();
//   if (!codFact) return;

//   // Verificar si ya está en la lista
//   if (this.detallesSalida.some(d => d.codFact === codFact)) {
//     this.mostrarError('Esta factura ya está en la lista');
//     this.txtcodFact = '';
//     return;
//   }

//   // Buscar factura
//   this.servicioFacturacion.getByNumero(codFact).subscribe({

//     next: (resp: any) => {
//       const factura = resp.data;

//       if (!factura) {
//         this.mostrarError('Factura no encontrada');
//         return;
//       }

//       // Validar condiciones
//       if (factura.fa_envio != 2) {
//         this.mostrarError(`La factura ${codFact} no está marcada para envío (fa_envio != 2)`);
//         return;
//       }

//       if (factura.fa_impresa !== 'S') {
//         this.mostrarError(`La factura ${codFact} no ha sido impresa`);
//         return;
//       }

//       if (factura.fa_salida && factura.fa_salida.trim() !== '') {
//         this.mostrarError(`La factura ${codFact} ya tiene salida registrada`);
//         return;
//       }

//       // Agregar a la lista
//       this.detallesSalida.push({
//         codFact: factura.fa_codFact,
//         nomClie: factura.fa_nomClie,
//         fecFact: factura.fa_fecFact,
//         valFact: Number(factura.fa_valFact),
//         codfpago: String(factura.fa_codfpago || '').trim(),
//         fpago: factura.fpago
//       });

//       this.txtcodFact = ''; // limpiar
//     },

//     error: (err) => {
//       console.error(err);

//       if (err.status === 404) {
//         Swal.fire({
//           title: 'Factura no encontrada',
//           icon: 'warning'
//         });
//       } else {
//         this.mostrarError('Error al buscar la factura');
//       }
//     }

//   });
// }

agregarFactura() {
  const codFact = this.txtcodFact.trim();
  if (!codFact) return;

  // Verificar si ya está en la lista
  if (this.detallesSalida.some(d => d.codFact === codFact)) {
    this.mostrarError('Esta factura ya está en la lista');
    this.txtcodFact = '';
    return;
  }

  this.servicioFacturacion.getByNumero(codFact).subscribe({
    next: (resp: any) => {
      const factura = resp.data;

      if (!factura) {
        this.mostrarError('Factura no encontrada');
        return;
      }

      // Validar condiciones
      if (Number(factura.fa_envio) !== 1) {
        this.mostrarError(`La factura ${codFact} no cumple condición de envío (fa_envio != 1)`);
        return;
      }

      if (factura.fa_impresa !== 'S') {
        this.mostrarError(`La factura ${codFact} no ha sido impresa`);
        return;
      }

      if (String(factura.fa_salida || '').trim().toUpperCase() !== 'N') {
        this.mostrarError(`La factura ${codFact} no cumple condición de salida (fa_salida != 'N')`);
        return;
      }

      // Agregar a la lista
      const fpagoRaw = String((factura as any)?.fa_fpago ?? '').trim().toUpperCase();
      const fpagoFlag = (fpagoRaw === 'S' || fpagoRaw === 'P') ? 'S' : 'N';
      this.detallesSalida.push({
        codFact: factura.fa_codFact,
        nomClie: factura.fa_nomClie,
        fecFact: factura.fa_fecFact,
        valFact: Number(factura.fa_valFact),
        codfpago: String(factura.fa_codfpago || '').trim(),
        fa_status: String(factura.fa_status || '').trim(),
        fpago: fpagoFlag
      });

      this.txtcodFact = ''; // limpiar
    },

    error: (err) => {
      console.error('Error al consultar factura:', err);

      // ← Aquí estaba el problema
      if (err.status === 404) {
        // Opción 1: usar tu método existente (recomendado para consistencia)
        this.mostrarError('Factura no encontrada');

        // Opción 2: si de verdad quieres Swal aquí
        // Swal.fire({
        //   title: 'Factura no encontrada',
        //   icon: 'warning',
        //   confirmButtonText: 'Aceptar'
        // });
      } else {
        this.mostrarError('Error al buscar la factura');
      }
    }
  });
}

  getDescripcionFpago(codigo: string): string {
    return this.mapaFpagos.get(codigo) || codigo; // Si no encuentra, muestra el código
  }


  esConduce(item: DetalleSalida): boolean {
    return String(item?.fa_status || '').trim().toUpperCase() === 'C';
  }

  eliminarDetalle(index: number) {
    const item = this.detallesSalida[index];
    if (!item) return;

    Swal.fire({
      title: '¿Eliminar factura?',
      text: `Se quitará la factura ${item.codFact} de esta salida.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
    }).then((result) => {
      if (result.isConfirmed) {
        this.detallesSalida.splice(index, 1);
      }
    });
  }

  guardarSalida() {
    if (!this.bloquearChofer || this.detallesSalida.length === 0) return;

    Swal.fire({
      title: '¿Procesar Salida?',
      text: `Se registrarán ${this.detallesSalida.length} facturas para el chofer ${this.nomChofer}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, procesar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.procesarGuardado();
      }
    });
  }

  async procesarGuardado() {
    if (this.esEdicion && (!this.salidaPendienteId || !Number.isFinite(this.salidaPendienteId))) {
      this.mostrarError('No se encontró el id de la salida pendiente para editar. Vuelva a seleccionar el chofer.');
      return;
    }

    if (!this.codSalida) {
      await this.generarCodSalida();
    }

    if (!this.codSalida) {
      const idSucursal = localStorage.getItem('idSucursal') || '(sin idSucursal)';
      this.mostrarError(
        `No se pudo generar el código de salida. Verifique contfactura para la sucursal ${idSucursal} (campos: ano y contsalida).`
      );
      return;
    }

    const idSucursal = localStorage.getItem('idSucursal');
    if (!idSucursal) {
      this.mostrarError('No se encontró idSucursal en localStorage');
      return;
    }

    const idUsuarioStr = localStorage.getItem('codigousuario');
    const idUsuario = idUsuarioStr ? Number(idUsuarioStr) : null;

    const now = new Date();
    const fechasalida = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const horaSalidaStr = now.toTimeString().split(' ')[0];
    // Mantener compatibilidad: enviamos un ISO completo (timestamptz) y también dejamos el campo camelCase.
    const horaSalidaIso = new Date(`1970-01-01T${horaSalidaStr}`).toISOString();

    const codChoferNum = Number(this.codChofer);
    if (!Number.isFinite(codChoferNum) || codChoferNum <= 0) {
      this.mostrarError('Código de chofer inválido.');
      return;
    }
    // Calcular totales
    const canFactura = this.detallesSalida.length;
    const valFactura = this.detallesSalida.reduce((sum, item) => sum + (Number(item.valFact) || 0), 0);
    
    // Calcular valPagado: sumar solo si fpago es 'S'
    const valPagado = this.detallesSalida.reduce((sum, item) => {
         const esPagada = String(item.fpago || '').trim().toUpperCase() === 'S';
         return sum + (esPagada ? (Number(item.valFact) || 0) : 0);
     }, 0);

    const codSalida = String(this.codSalida || '').trim();
    const idsucursalNum = Number(idSucursal);

    const detallesPayload = this.detallesSalida.map(d => {
      const pagado = String(d.fpago || '').trim().toUpperCase() === 'S' ? 'S' : 'N';
      return {
        // Duplicamos en camelCase y snake/lowercase para compatibilidad con backends existentes
        codSalida,
        codsalida: codSalida,
        idsucursal: idsucursalNum,
        idSucursal: idsucursalNum,
        codChofer: codChoferNum,
        codchofer: codChoferNum,
        nomChofer: this.nomChofer,
        nomchofer: this.nomChofer,
        codFact: d.codFact,
        codfact: d.codFact,
        valFact: d.valFact,
        valfact: d.valFact,
        fecFact: d.fecFact,
        fecfact: d.fecFact,
        nomClie: d.nomClie,
        nomclie: d.nomClie,
        pagado,
        // Fallback: algunos backends usan "fpago" como flag de pagado
        fpago: pagado,
        status: 'P',
      };
    });

    const payload = {
      codSalida,
      codsalida: codSalida,
      idsucursal: idsucursalNum,
      idSucursal: idsucursalNum,
      idusuario: idUsuario,
      idUsuario: idUsuario,
      fecSalida: fechasalida,
      fecsalida: fechasalida,
      horaSalida: horaSalidaIso,
      horasalida: horaSalidaIso,
      canFact: canFactura,
      canfact: canFactura,
      valFact: valFactura,
      valfact: valFactura,
      valPagado: valPagado,
      valpagado: valPagado,
      codChofer: codChoferNum,
      codchofer: codChoferNum,
      nomChofer: this.nomChofer,
      nomchofer: this.nomChofer,
      cedChofer: this.cedChofer,
      cedchofer: this.cedChofer,
      status: 'P',
      detalles: detallesPayload,
    };

    const peticion = this.esEdicion
      ? this.servicioSalida.editarSalida(
          Number(this.salidaPendienteId ?? 0),
          { ...payload, id: this.salidaPendienteId, codSalida: this.codSalida }
        )
      : this.servicioSalida.guardarSalida(payload);

    peticion.subscribe({
      next: (resp: any) => {
        // Actualizar facturas con fa_salida='S' y idsalida=codSalida
        const actualizaciones = this.detallesSalida.map(detalle => {
            const updatePayload = {
                fa_salida: 'S',
                idsalida: Number(this.codSalida)
            };
            return this.servicioFacturacion.actualizarSalidaFactura(detalle.codFact, updatePayload);
        });

        if (actualizaciones.length > 0) {
            forkJoin(actualizaciones).subscribe({
                next: () => {
                    Swal.fire('Éxito', 'Salida registrada y facturas actualizadas correctamente', 'success');
                    
                    // Guardar datos para impresión y habilitar botón
                    this.datosUltimaSalida = { ...payload, detalles: [...this.detallesSalida] };
                    this.mostrarBotonImprimir = true;
                    
                    this.limpiarTodo(false); // No limpiar completamente para permitir imprimir
                },
                error: (err) => {
                    console.error('Error al actualizar estados de facturas', err);
                    Swal.fire('Atención', 'Salida registrada pero hubo error actualizando algunas facturas', 'warning');
                    
                    // Aún si hubo error en actualizar facturas, permitimos imprimir lo que se intentó guardar
                    this.datosUltimaSalida = { ...payload, detalles: [...this.detallesSalida] };
                    this.mostrarBotonImprimir = true;
                    
                    this.limpiarTodo(false);
                }
            });
        } else {
             Swal.fire('Éxito', 'Salida registrada correctamente', 'success');
             this.datosUltimaSalida = { ...payload, detalles: [...this.detallesSalida] };
             this.mostrarBotonImprimir = true;
             this.limpiarTodo(false);
        }
      },
      error: (err) => {
        console.error(err);
        if (!this.esEdicion && err.status === 409) {
           Swal.fire({
             title: 'Código duplicado',
             text: 'El código de salida ya existe. Actualizando contador... Intente guardar de nuevo.',
             icon: 'warning',
             timer: 3000,
             showConfirmButton: false
           });
           // Si hay conflicto, actualizamos el contador para saltar el número usado
           this.actualizarContadorSalida(() => {
               this.generarCodSalida();
           });
        } else {
           Swal.fire('Error', this.extraerMensajeError(err), 'error');
        }
      }
    });
  }

  actualizarContadorSalida(callback?: () => void) {
    if (this.contFacturaActual && (this.contFacturaActual.id || this.contFacturaActual.idContFact)) {
       const id = this.contFacturaActual.id || this.contFacturaActual.idContFact;
       const ultimoContador = this.contFacturaActual.contsalida !== undefined && this.contFacturaActual.contsalida !== null ? Number(this.contFacturaActual.contsalida) : 0;
       const nuevoContador = ultimoContador + 1;

       // Clonar el objeto y actualizar contsalida
       const payload = { ...this.contFacturaActual, contsalida: nuevoContador };

       this.servicioContFactura.editarContFactura(id, payload).subscribe({
         next: () => {
            console.log('Contador de salida actualizado correctamente a', nuevoContador);
            console.log('Payload enviado:', payload);
            if (callback) callback();
         },
         error: (err: any) =>
           console.error('Error al actualizar contador de salida', err),
       });
    }
  }

  limpiarTodo(borrarBotonImprimir: boolean = true) {
    this.codChofer = '';
    this.nomChofer = '';
    this.cedChofer = '';
    this.bloquearChofer = false;
    this.txtcodFact = '';
    this.detallesSalida = [];
    this.esEdicion = false;
    this.salidaPendienteId = null;
    if (borrarBotonImprimir) {
        this.mostrarBotonImprimir = false;
        this.datosUltimaSalida = null;
    }
    this.generarCodSalida(); // Regenerar código para la siguiente transacción
  }

  imprimirControlSalida() {
    if (!this.datosUltimaSalida) {
      this.mostrarError('No hay datos para imprimir');
      return;
    }

    // Ocultar botón al imprimir
    this.imprimirControlSalidaFormatoControlCaja();
    return;

    this.mostrarBotonImprimir = false;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 297] // Ancho 80mm (rollo térmico), Alto suficiente
    });
    
    const data = this.datosUltimaSalida;
    const nombreSucursal = this.nombreSucursalActual || 'SUCURSAL PRINCIPAL'; 
    const zonaSucursal = this.zonaSucursalActual || '';

    // Helper para formato moneda 999,999,999.99
    const fmt = (num: any) => Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    // Helper para formato fecha dd/mm/aaaa
    const fmtFecha = (fecha: string) => {
        if (!fecha) return '';
        let datePart = fecha;
        // Eliminar parte de hora si existe
        if (fecha.includes('T')) datePart = fecha.split('T')[0];
        else if (fecha.includes(' ')) datePart = fecha.split(' ')[0];
        
        const partes = datePart.split('-');
        if (partes.length === 3) {
            return `${partes[2]}/${partes[1]}/${partes[0]}`;
        }
        return fecha;
    };

    // Helper para formato hora
    const fmtHora = (hora: any) => {
        if (!hora) return '';
        if (hora instanceof Date) {
            return hora.toTimeString().split(' ')[0];
        }
        return String(hora);
    };

    // Márgenes y configuración
    const margenIzquierdo = 4;
    const anchoPagina = 80;
    const centroPagina = anchoPagina / 2;
    let y = 10; // Posición vertical inicial

    // Encabezado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(nombreSucursal, centroPagina, y, { align: 'center', maxWidth: 70 });
    y += 5;
    
    if (zonaSucursal) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(zonaSucursal, centroPagina, y, { align: 'center', maxWidth: 70 });
        y += 5;
    } else {
        y += 3;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('REPORTE DE CONTROL DE SALIDA', centroPagina, y, { align: 'center' });
    y += 7;

    // Datos Generales
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Código Salida: ${data.codSalida}`, margenIzquierdo, y);
    y += 4.5;
    doc.text(`Fecha: ${fmtFecha(data.fecSalida)} ${fmtHora(data.horaSalida)}`, margenIzquierdo, y);
    y += 4.5;
    doc.text(`Chofer: ${data.nomChofer}`, margenIzquierdo, y);
    y += 5;

    // Totales cabecera
    doc.text(`Cant. Facturas: ${data.canFact || data.CanFact}`, margenIzquierdo, y);
    y += 4.5;
    doc.text(`Valor Total: $${fmt(data.valFact || data.ValFact)}`, margenIzquierdo, y);
    y += 4.5;
    doc.text(`Valor Pagado: $${fmt(data.valPagado || 0)}`, margenIzquierdo, y);
    y += 6;

    // Tabla de Detalles
    // Para 80mm, ajustamos columnas para incluir cliente y fecha
    const columnas = ['Fact.', 'Fecha', 'Cliente', 'Est.', 'Valor'];
    const filas = data.detalles.map((d: any) => [
      d.codFact,
      fmtFecha(d.fecFact), // Usar formato completo dd/mm/aaaa
      (d.nomClie || '').substring(0, 12), // Truncar nombre cliente para no romper formato
      d.fpago === 'P' ? 'PAG' : (d.fpago || '').substring(0, 3), // Abreviar más F.Pago
      `$${fmt(d.valFact)}`
    ]);

    autoTable(doc, {
      startY: y,
      head: [columnas],
      body: filas,
      theme: 'plain', // Tema simple para impresoras térmicas
      styles: { 
        fontSize: 7,
        cellPadding: 0.8,
        minCellHeight: 4,
        overflow: 'linebreak' 
      },
      headStyles: { 
        fontStyle: 'bold',
        fillColor: [220, 220, 220],
        textColor: 0,
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 14 },
        1: { cellWidth: 14 },
        2: { cellWidth: 17 },
        3: { cellWidth: 8, halign: 'center' },
        4: { cellWidth: 19, halign: 'right' }
      },
      margin: { left: margenIzquierdo, right: 2 },
      tableWidth: 72 // Ajustar al ancho disponible (80 - margenes)
    });

    // Obtener la posición final de la tabla para el pie
    const finalY = (doc as any).lastAutoTable.finalY + 5;

    // Total final
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: $${fmt(data.valFact || data.ValFact)}`, 70, finalY, { align: 'right' });
    
    let currentY = finalY + 8;

    // Declaración de Responsabilidad
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DECLARACIÓN DE RESPONSABILIDAD', centroPagina, currentY, { align: 'center' });
    currentY += 4.5;

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    
    // Línea 1: Yo, [Nombre], (subrayado)
    const textoYo = 'Yo, ';
    const textoNombre = data.nomChofer || '';
    const textoComa = ',';
    
    const anchoYo = doc.getTextWidth(textoYo);
    const anchoNombre = doc.getTextWidth(textoNombre);
    
    doc.text(textoYo, margenIzquierdo, currentY);
    doc.text(textoNombre, margenIzquierdo + anchoYo, currentY);
    doc.line(margenIzquierdo + anchoYo, currentY + 0.5, margenIzquierdo + anchoYo + anchoNombre, currentY + 0.5); // Subrayado
    doc.text(textoComa, margenIzquierdo + anchoYo + anchoNombre, currentY);
    
    currentY += 3.5;

    // Línea 2: portador(a) de la Cédula... (Cédula subrayada)
    const textoPortador = 'portador(a) de la Cédula de Identidad No. ';
    const textoCedula = data.cedChofer || '_______________';
    const textoComa2 = ' ,';

    const anchoPortador = doc.getTextWidth(textoPortador);
    const anchoCedula = doc.getTextWidth(textoCedula);

    doc.text(textoPortador, margenIzquierdo, currentY);
    doc.text(textoCedula, margenIzquierdo + anchoPortador, currentY);
    doc.line(margenIzquierdo + anchoPortador, currentY + 0.5, margenIzquierdo + anchoPortador + anchoCedula, currentY + 0.5); // Subrayado
    doc.text(textoComa2, margenIzquierdo + anchoPortador + anchoCedula, currentY);

    currentY += 3.5;

    // Resto del texto
    const textoLegal = `declaro bajo juramento que me responsabilizo plenamente por las mercancías y valores correspondientes a las facturas detalladas anteriormente en este documento. Me comprometo a entregar, dentro de un plazo máximo de veinticuatro (24) horas , el equivalente en pesos dominicanos de los valores consignados, o en su defecto, a realizar la devolución íntegra de las mercancías entregadas a la persona debidamente designada por la empresa. En caso de incumplimiento de lo aquí establecido, AUTORIZO EXPRESAMENTE a la empresa a descontar de mi salario el monto correspondiente a los valores consignados, conforme a las disposiciones legales vigentes. Para los fines legales correspondientes, firmo la presente declaración en la fecha indicada en este documento.`;

    const splitText = doc.splitTextToSize(textoLegal, anchoPagina - (margenIzquierdo * 2));
    doc.text(splitText, margenIzquierdo, currentY);
    
    const textHeight = doc.getTextDimensions(splitText).h;
    currentY += textHeight + 10;

    // Espacio para firma
    doc.setLineWidth(0.5);
    doc.line(10, currentY, 70, currentY);
    doc.setFontSize(9);
    doc.text('Firma Recibido', centroPagina, currentY + 4, { align: 'center' });
    
    const blob = doc.output('blob') as Blob;
    this.printingService.printBlob(blob, 'ticket');
  }

  private imprimirControlSalidaFormatoControlCaja() {
    const data = this.datosUltimaSalida;
    const detalles = Array.isArray(data?.detalles) ? data.detalles : [];
    this.mostrarBotonImprimir = false;

    const formatoMoneda = new Intl.NumberFormat('es-DO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const fmt = (value: any) => formatoMoneda.format(Number(value) || 0);
    const formatDate = (value: any) => {
      if (typeof value === 'string') {
        const datePart = value.includes('T') ? value.split('T')[0] : value.split(' ')[0];
        const parts = datePart.split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }
      const date = value instanceof Date ? value : new Date(value || new Date());
      if (isNaN(date.getTime())) return '';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    const esPagada = (d: any) => {
      const value = String(d?.pagado ?? d?.fpago ?? d?.fa_fpago ?? '')
        .trim()
        .toUpperCase();
      return value === 'S' || value === 'P' || value === '1' || value === 'TRUE' || value === 'PAGADO';
    };

    const totalPagadoReporte = detalles.reduce(
      (sum: number, d: any) => sum + (esPagada(d) ? Number(d.valFact ?? d.valfact) || 0 : 0),
      0
    );
    const totalPendienteReporte = detalles.reduce(
      (sum: number, d: any) => sum + (!esPagada(d) ? Number(d.valFact ?? d.valfact) || 0 : 0),
      0
    );
    const totalGeneralReporte = totalPagadoReporte + totalPendienteReporte;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 297],
    });
    const left = 8;
    const right = 76;
    const center = 42;
    const contentWidth = right - left;
    let y = 8;

    const line = () => {
      doc.line(left, y, right, y);
      y += 4;
    };
    const centerText = (text: string, size = 8, bold = false) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.text(text, center, y, { align: 'center', maxWidth: contentWidth });
      y += 4;
    };
    const fitText = (value: any, maxWidth: number) => {
      const original = String(value || '').trim();
      if (doc.getTextWidth(original) <= maxWidth) return original;

      let shortened = original;
      while (
        shortened.length > 1 &&
        doc.getTextWidth(`${shortened}...`) > maxWidth
      ) {
        shortened = shortened.slice(0, -1);
      }
      return `${shortened.trim()}...`;
    };
    const imprimirEncabezadoDetalle = () => {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Factura', left, y);
      doc.text('Fecha', left + 29, y);
      doc.text('Status', right, y, { align: 'right' });
      y += 4;
      doc.line(left, y, right, y);
      y += 4;
    };

    centerText(this.nombreSucursalActual || 'SUCURSAL PRINCIPAL', 10, true);
    if (this.zonaSucursalActual) {
      centerText(this.zonaSucursalActual, 8);
    }
    centerText('REPORTE DE CONTROL DE SALIDA', 10, true);
    centerText(`Salida: ${data?.codSalida || data?.codsalida || ''}`, 8);
    centerText(`Fecha: ${formatDate(data?.fecSalida || data?.fecsalida || new Date())}`, 8);
    line();

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Chofer: ${data?.nomChofer || data?.nomchofer || ''}`, left, y, { maxWidth: contentWidth });
    y += 5;
    doc.text(`Codigo: ${data?.codChofer || data?.codchofer || ''}`, left, y);
    y += 5;
    doc.text(`Cant. facturas: ${detalles.length || data?.canFact || data?.canfact || 0}`, left, y);
    y += 5;
    line();

    doc.setFont('helvetica', 'bold');
    doc.text('Total valor:', left, y);
    doc.text(fmt(totalGeneralReporte), right, y, { align: 'right' });
    y += 5;
    doc.text('Factura pagada:', left, y);
    doc.text(fmt(totalPagadoReporte), right, y, { align: 'right' });
    y += 5;
    doc.text('Total Fact. pendiente de pago:', left, y);
    doc.setFontSize(9);
    doc.text(`(${fmt(totalPendienteReporte)})`, right, y, { align: 'right' });
    y += 6;
    line();

    doc.setFontSize(8);
    imprimirEncabezadoDetalle();

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    detalles.forEach((d: any) => {
      if (y > 273) {
        doc.addPage([80, 297], 'portrait');
        y = 8;
        imprimirEncabezadoDetalle();
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
      }
      const pendientePago = !esPagada(d);
      const codFact = String(d.codFact || d.codfact || '');
      doc.setFont('helvetica', pendientePago ? 'bold' : 'normal');
      doc.text(pendientePago ? `(${codFact})` : codFact, left, y);
      doc.text(formatDate(d.fecFact || d.fecfact), left + 29, y);
      doc.setFont('helvetica', 'bold');
      doc.text(esPagada(d) ? 'Pagada' : '', right, y, { align: 'right' });
      y += 5;
      doc.setFont('helvetica', pendientePago ? 'bold' : 'normal');
      doc.text(fitText(d.nomClie || d.nomclie, contentWidth - 24), left, y);
      const valFact = fmt(d.valFact || d.valfact);
      doc.text(pendientePago ? `(${valFact})` : valFact, right, y, { align: 'right' });
      y += 6;
      doc.setFont('helvetica', 'normal');
    });

    if (y > 278) {
      doc.addPage([80, 297], 'portrait');
      y = 12;
    }
    y += 8;
    doc.line(left + 2, y, right - 2, y);
    y += 5;
    doc.text('Firma recibido', center, y, { align: 'center' });
    y += 8;

    if (y > 270) {
      doc.addPage([80, 297], 'portrait');
      y = 12;
    }
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DECLARACION DE RESPONSABILIDAD', center, y, { align: 'center' });
    y += 5;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    const textoLegal = `Yo, ${data?.nomChofer || data?.nomchofer || ''}, portador(a) de la cedula ${data?.cedChofer || data?.cedchofer || ''}, declaro que recibo las facturas detalladas en este control de salida y me responsabilizo por las mercancias y valores correspondientes.`;
    const splitText = doc.splitTextToSize(textoLegal, contentWidth);
    doc.text(splitText, left, y);

    const blob = doc.output('blob') as Blob;
    this.printingService.printBlob(blob, 'ticket');
  }

  get totalSalida(): number {
    return this.detallesSalida.reduce((sum, item) => sum + Number(item.valFact), 0);
  }

  // mostrarError(msg: string) {
  //   Swal.fire({
  //     icon: 'error',
  //     title: 'Atención',
  //     text: msg,
  //     timer: 2000,
  //     showConfirmButton: false
  //   });
  // }

}
