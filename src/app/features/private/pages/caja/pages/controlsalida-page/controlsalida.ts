import { Component } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { ServicioChofer } from 'src/app/core/services/mantenimientos/choferes/choferes.service';
import { ServicioSalidafactura } from 'src/app/core/services/almacen/salidafactura/salidafactura.service';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { ServicioCierreCaja } from 'src/app/core/services/caja/cierrecaja/cierrecaja.service';
import Swal from 'sweetalert2';

interface DetalleSalidaCaja {
  codFact: string;
  nomClie: string;
  fecFact: any;
  valFact: number;
  fpago: string;
  pagado: boolean;
  pagadoOriginal: boolean;
  entregada: boolean;
  entregadaOriginal: boolean;
}

@Component({
  selector: 'app-controlsalidacaja',
  templateUrl: './controlsalida.html',
  styleUrls: ['./controlsalida.css'],
})
export class ControlSalidaCajaComponent {
  codChofer: string = '';
  nomChofer: string = '';
  bloquearChofer: boolean = false;
  choferesEncontrados: any[] = [];
  mostrarListaChoferes: boolean = false;
  mostrarModalChofer: boolean = false;
  listaChoferesEncontrados: any[] = [];
  indiceChoferSeleccionado: number = 0;

  salidaActual: any = null;
  detalles: DetalleSalidaCaja[] = [];

  totalSalida: number = 0;
  totalPagado: number = 0;
  totalPendiente: number = 0;

  cargando: boolean = false;
  guardando: boolean = false;
  ultimaFacturaCuadrada: string | null = null;

  constructor(
    private servicioChofer: ServicioChofer,
    private servicioSalida: ServicioSalidafactura,
    private servicioFacturacion: ServicioFacturacion,
    private servicioCierre: ServicioCierreCaja
  ) {}

  ngOnInit() {
    this.cargarUltimoCierre();
  }

  cargarUltimoCierre() {
    this.servicioCierre.obtenerUltimoCierre().subscribe({
      next: (resp: any) => {
        // Asumiendo que resp.data contiene el objeto del último cierre
        // y que tiene un campo como 'cc_finFact' o similar.
        // Si no, tendremos que ajustar esto.
        const data = resp.data || resp;
        if (data && data.cc_finFact) {
           this.ultimaFacturaCuadrada = data.cc_finFact;
        }
      },
      error: (err: any) => {
        console.error('Error al obtener último cierre', err);
      }
    });
  }

  buscarChoferPorNombre(valor: string) {
    const termino = (valor || '').trim();
    if (!termino) {
      this.mostrarListaChoferes = false;
      this.choferesEncontrados = [];
      this.mostrarModalChofer = false;
      this.listaChoferesEncontrados = [];
      return;
    }

    this.cargando = true;
    this.mostrarListaChoferes = false;
    this.choferesEncontrados = [];
    this.servicioChofer.buscarTodosChofer(1, 20, termino).subscribe({
      next: (resp: any) => {
        const lista = resp?.data || resp || [];
        if (!Array.isArray(lista) || lista.length === 0) {
          this.mostrarMensaje('No se encontraron choferes con ese nombre');
          this.mostrarModalChofer = false;
          this.listaChoferesEncontrados = [];
          return;
        }

        this.choferesEncontrados = lista;
        this.mostrarListaChoferes = true;
        this.listaChoferesEncontrados = lista;
        this.mostrarModalChofer = true;
        this.indiceChoferSeleccionado = 0;
      },
      error: () => {
        this.mostrarMensaje('Error al buscar chofer por nombre');
      },
      complete: () => {
        this.cargando = false;
      },
    });
  }

  onKeydownNombreChofer(event: KeyboardEvent) {
    if (this.mostrarModalChofer && this.listaChoferesEncontrados.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (this.indiceChoferSeleccionado < this.listaChoferesEncontrados.length - 1) {
          this.indiceChoferSeleccionado++;
        }
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (this.indiceChoferSeleccionado > 0) {
          this.indiceChoferSeleccionado--;
        }
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const chofer = this.listaChoferesEncontrados[this.indiceChoferSeleccionado];
        if (chofer) {
          this.seleccionarChofer(chofer);
        }
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        this.cerrarModalChofer();
        return;
      }
    } else if (event.key === 'Enter' && this.nomChofer && this.nomChofer.trim()) {
      event.preventDefault();
      this.buscarChoferPorNombre(this.nomChofer);
    }
  }

  cerrarModalChofer() {
    this.mostrarModalChofer = false;
  }

  onEnterNombreChofer() {
    if (this.mostrarListaChoferes && this.choferesEncontrados.length > 0) {
      this.seleccionarChofer(this.choferesEncontrados[0]);
    } else if (this.nomChofer && this.nomChofer.trim()) {
      this.buscarChoferPorNombre(this.nomChofer);
    }
  }

  buscarChoferPorCodigo() {
    const codigo = this.codChofer.trim();
    if (!codigo) {
      return;
    }

    this.cargando = true;
    this.servicioChofer.buscarchoferporCodigo(Number(codigo)).subscribe({
      next: (resp: any) => {
        const data = resp?.data || resp;
        if (!data) {
          this.mostrarMensaje('Chofer no encontrado');
          this.resetChofer();
          return;
        }
        const nombre = data.nomChofer || data.nombre || data.ch_nombre || '';
        const apellido = data.apellido || data.ch_apellido || '';
        this.nomChofer = apellido ? `${nombre} ${apellido}`.trim() : nombre;
        this.bloquearChofer = true;
        this.cargarSalidaChofer();
      },
      error: () => {
        this.mostrarMensaje('Error al buscar chofer');
        this.resetChofer();
      },
      complete: () => {
        this.cargando = false;
      },
    });
  }

  seleccionarChofer(chofer: any) {
    const nombre = chofer.nomChofer || chofer.nombre || chofer.ch_nombre || '';
    const apellido = chofer.apellido || chofer.ch_apellido || '';
    this.nomChofer = apellido ? `${nombre} ${apellido}`.trim() : nombre;
    this.codChofer = String(chofer.codChofer || chofer.id || chofer.ch_codChofer || '');

    if (!this.codChofer) {
      this.mostrarMensaje('No se pudo determinar el código del chofer seleccionado');
      return;
    }

    this.bloquearChofer = true;
    this.mostrarListaChoferes = false;
    this.choferesEncontrados = [];
    this.mostrarModalChofer = false;
    this.listaChoferesEncontrados = [];
    this.cargarSalidaChofer();
  }

  cargarSalidaChofer() {
    if (!this.codChofer.trim()) {
      return;
    }
    if (this.guardando) {
      return;
    }
    this.cargando = true;
    this.servicioSalida.obtenerPorChoferYStatus(this.codChofer).subscribe({
      next: (resp: any) => {
        const salidas = Array.isArray(resp) ? resp : resp?.data || [];
        if (!salidas || salidas.length === 0) {
          this.salidaActual = null;
          this.detalles = [];
          this.calcularTotales();
          this.mostrarMensaje('El chofer no tiene control de salida pendiente');
          this.cargando = false;
          return;
        }
        const salida = salidas[0];
        this.salidaActual = salida;

        const dets = salida.detsalida || [];
        if (!dets.length) {
          this.detalles = [];
          this.calcularTotales();
          return;
        }

        const observables = dets.map((d: any) =>
          this.servicioFacturacion.getByNumero(d.codFact)
        );

        forkJoin(observables).subscribe(
          (resps) => {
            const resArray = resps as any[];
            this.detalles = resArray.map((resp: any, index: number) => {
              const f = resp?.data || resp;
              const det = dets[index];
              const estadoFactura = String(f?.fa_status || '').trim().toUpperCase();
              const pagoFactura = String(f?.fa_fpago || '').trim().toUpperCase();
              const esPagadaPorSalida = det?.pagado === 'S';
              const esPagadaPorFactura =
                estadoFactura === 'P' ||
                estadoFactura === 'PAGADA' ||
                pagoFactura === 'P';
              return {
                codFact: f?.fa_codFact || det.codFact,
                nomClie: f?.fa_nomClie || '',
                fecFact: f?.fa_fecFact || det.fecFact,
                valFact: Number(
                  (f && f.fa_valFact !== undefined
                    ? f.fa_valFact
                    : det.valFact) || 0
                ),
                fpago: f?.fa_fpago || '',
                pagado: esPagadaPorSalida || esPagadaPorFactura,
                pagadoOriginal: esPagadaPorFactura,
                entregada: (f?.fa_entrega || '').trim().toUpperCase() === 'S',
                entregadaOriginal: (f?.fa_entrega || '').trim().toUpperCase() === 'S'
              };
            });
            this.calcularTotales();
            this.cargando = false;
          },
          () => {
            this.mostrarMensaje(
              'Error al cargar las facturas relacionadas a la salida'
            );
            this.cargando = false;
          }
        );
      },
      error: () => {
        this.mostrarMensaje('Error al cargar control de salida');
        this.cargando = false;
      },
    });
  }

  cambiarChofer() {
    this.resetChofer();
  }

  togglePagado(detalle: DetalleSalidaCaja) {
    if (detalle.pagadoOriginal && detalle.pagado) {
      this.mostrarMensaje(
        'Esta factura ya está pagada en facturación y no se puede desmarcar'
      );
      return;
    }
    detalle.pagado = !detalle.pagado;
    this.calcularTotales();
  }

  toggleTodosPagado() {
    const todosMarcados = this.detalles.every(
      (d) => d.pagado || d.pagadoOriginal
    );

    if (todosMarcados) {
      let algunoBloqueado = false;
      this.detalles.forEach((d) => {
        if (d.pagadoOriginal) {
          d.pagado = true;
          algunoBloqueado = true;
        } else {
          d.pagado = false;
        }
      });
      if (algunoBloqueado) {
        this.mostrarMensaje(
          'Algunas facturas ya están pagadas en facturación y no se pueden desmarcar'
        );
      }
    } else {
      this.detalles.forEach((d) => {
        d.pagado = true;
      });
    }

    this.calcularTotales();
  }

  toggleEntrega(detalle: DetalleSalidaCaja) {
    detalle.entregada = !detalle.entregada;
  }

  toggleTodosEntregada() {
    const todasEntregadas = this.detalles.every((d) => d.entregada);
    const nuevoEstado = !todasEntregadas;

    this.detalles.forEach((d) => {
      d.entregada = nuevoEstado;
    });
  }

  calcularTotales() {
    this.totalSalida = this.detalles.reduce(
      (sum, d) => sum + (Number(d.valFact) || 0),
      0
    );
    this.totalPagado = this.detalles.reduce(
      (sum, d) => sum + (d.pagado ? Number(d.valFact) || 0 : 0),
      0
    );
    this.totalPendiente = this.totalSalida - this.totalPagado;
  }

  guardarCobro() {
    if (!this.salidaActual || !this.salidaActual.id) {
      this.mostrarMensaje('No hay control de salida seleccionado');
      return;
    }

    const hayPendientesPago = this.detalles.some((d) => !d.pagado);
    if (hayPendientesPago) {
      this.mostrarMensaje(
        'No se puede guardar el cobro porque hay facturas pendientes de pago. Por favor marque todas como pagadas.',
        'warning',
        true
      );
      return;
    }

    const hayPendientesEntrega = this.detalles.some((d) => !d.entregada);
    if (hayPendientesEntrega) {
      this.mostrarMensaje(
        'No se puede guardar el cobro porque hay facturas pendientes de entrega. Por favor marque todas como entregadas.',
        'warning',
        true
      );
      return;
    }

    this.cargando = true;

    const valPagado = this.detalles.reduce(
      (sum, d) => sum + (d.pagado ? Number(d.valFact) || 0 : 0),
      0
    );

    const detallesPayload = this.detalles.map((d) => ({
      codSalida: this.salidaActual.codSalida,
      idsucursal: this.salidaActual.idsucursal,
      codChofer: this.salidaActual.codChofer,
      nomChofer: this.salidaActual.nomChofer,
      codFact: d.codFact,
      valFact: d.valFact,
      fecFact: d.fecFact,
      pagado: d.pagado ? 'S' : 'N',
    }));

    const payload = {
      ...this.salidaActual,
      valPagado,
      status: 'C',
      detalles: detallesPayload,
    };

    const cobroObservable = this.servicioSalida.editarSalida(Number(this.salidaActual.id), payload);

    const facturasParaActualizar: any[] = [];

    this.detalles.forEach((d) => {
      let item: any = { fa_codFact: d.codFact };
      let changed = false;

      // Verificar cambio en pagado (solo si no estaba pagada originalmente)
      if (!d.pagadoOriginal) {
        if (d.pagado !== d.pagadoOriginal) {
          // Si d.pagado es true, enviamos 'P'. Si es false, restauramos el fpago original.
          // Nota: d.pagadoOriginal es false aquí.
          // Si d.pagado es true, cambió a pagado.
          // Si d.pagado es false, es igual al original (pendiente), pero si venía pagado de control salida
          // y lo desmarcamos, queremos que en factura siga pendiente (o se asegure).
          // En este caso, si d.pagado es true, enviamos 'P'.
          // Si es false, enviamos d.fpago (que debería ser el original, ej: 'CREDITO').
          item.fa_fpago = d.pagado ? 'P' : d.fpago;
          changed = true;
        }
      }

      // Verificar cambio en entrega
      if (d.entregada !== d.entregadaOriginal) {
        item.fa_entrega = d.entregada ? 'S' : 'N';
        changed = true;
      }

      if (changed) {
        facturasParaActualizar.push(item);
      }
    });

    const observables: Observable<any>[] = [cobroObservable];

    if (facturasParaActualizar.length > 0) {
      observables.push(
        this.servicioFacturacion.actualizarPagoYEntrega(facturasParaActualizar)
      );
    }

    forkJoin(observables).subscribe({
      next: () => {
        this.resetChofer();
        this.cargando = false;
        this.guardando = false;
        this.mostrarMensaje('Cobro y cambios guardados correctamente', 'success');
      },
      error: () => {
        this.mostrarMensaje('Error al guardar los cambios');
        this.cargando = false;
        this.guardando = false;
      },
      complete: () => {
        this.cargando = false;
        this.guardando = false;
      },
    });
  }

  private resetChofer() {
    this.codChofer = '';
    this.nomChofer = '';
    this.bloquearChofer = false;
    this.choferesEncontrados = [];
    this.mostrarListaChoferes = false;
    this.mostrarModalChofer = false;
    this.listaChoferesEncontrados = [];
    this.salidaActual = null;
    this.detalles = [];
    this.calcularTotales();
  }

  private mostrarMensaje(texto: string, icono: any = 'info', confirmButton: boolean = false) {
    Swal.fire({
      icon: icono,
      title: 'Información',
      text: texto,
      timer: confirmButton ? undefined : 2000,
      showConfirmButton: confirmButton,
      confirmButtonText: 'Aceptar'
    });
  }

  esMayorAlCierre(codFact: string): boolean {
    if (!this.ultimaFacturaCuadrada) return true; // Si no hay cierre, todas son nuevas
    
    const cod = Number(codFact);
    const last = Number(this.ultimaFacturaCuadrada);

    if (isNaN(cod) || isNaN(last)) {
      // Comparación lexicográfica si no son números válidos
      return String(codFact) > String(this.ultimaFacturaCuadrada);
    }
    
    return cod > last;
  }
}
