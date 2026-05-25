import { Component, OnInit, OnDestroy } from '@angular/core';
import { forkJoin, Observable, Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ServicioChofer } from 'src/app/core/services/mantenimientos/choferes/choferes.service';
import { ServicioSalidafactura } from 'src/app/core/services/almacen/salidafactura/salidafactura.service';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { ServicioCierreCaja } from 'src/app/core/services/caja/cierrecaja/cierrecaja.service';
import { ServicioFpago } from 'src/app/core/services/mantenimientos/fpago/fpago.service';
import { PrintingService } from 'src/app/core/services/utils/printing.service';
import Swal from 'sweetalert2';
import { jsPDF } from 'jspdf';

interface DetalleSalidaCaja {
  codFact: string;
  nomClie: string;
  fecFact: any;
  valFact: number;
  fpago: string;
  codfpago: string;
  descfpago: string;
  fa_status: string;
  pagado: boolean;
  pagadoOriginal: boolean;
  entregada: boolean;
  entregadaOriginal: boolean;
}

interface TotalPorFormaPago {
  codigo: string;
  descripcion: string;
  cantidad: number;
  total: number;
}

@Component({
  selector: 'app-controlsalidacaja',
  templateUrl: './controlsalida.html',
  styleUrls: ['./controlsalida.css'],
})
export class ControlSalidaCajaComponent implements OnInit, OnDestroy {
  codChofer: string = '';
  nomChofer: string = '';
  bloquearChofer: boolean = false;
  choferesEncontrados: any[] = [];
  mostrarListaChoferes: boolean = false;
  mostrarModalChofer: boolean = false;
  listaChoferesEncontrados: any[] = [];
  indiceChoferSeleccionado: number = 0;
  private searchSubject = new Subject<string>();
  private searchSubscription: Subscription | undefined;

  salidaActual: any = null;
  detalles: DetalleSalidaCaja[] = [];

  totalSalida: number = 0;
  totalPagado: number = 0;
  totalPendiente: number = 0;
  totalNoGestionable: number = 0;
  cobradoPorFormaPago: TotalPorFormaPago[] = [];
  private mapaFormasPago = new Map<string, string>();

  cargando: boolean = false;
  guardando: boolean = false;
  ultimaFacturaCuadrada: string | null = null;
  ultimoControlImpresion: any = null;

  constructor(
    private servicioChofer: ServicioChofer,
    private servicioSalida: ServicioSalidafactura,
    private servicioFacturacion: ServicioFacturacion,
    private servicioCierre: ServicioCierreCaja,
    private servicioFpago: ServicioFpago,
    private printingService: PrintingService
  ) {}

  ngOnInit() {
    this.cargarUltimoCierre();
    this.cargarFormasPago();
    this.searchSubscription = this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((termino) => {
        this.ejecutarBusquedaChofer(termino);
      });
  }

  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  cargarUltimoCierre() {
    this.servicioCierre.obtenerUltimoCierre().subscribe({
      next: (resp: any) => {
        // Asumiendo que resp.data contiene el objeto del último cierre
        // y que tiene un campo como 'cc_finFact' o similar.
        // Si no, tendremos que ajustar esto.
        const cierres = Array.isArray(resp?.data)
          ? resp.data
          : resp?.data
            ? [resp.data]
            : Array.isArray(resp)
              ? resp
              : [];
        const ultimo = cierres[0] || null;
        this.ultimaFacturaCuadrada =
          ultimo?.cc_finFact || ultimo?.factfin || '';
      },
      error: (err: any) => {
        console.error('Error al obtener último cierre', err);
      }
    });
  }

  cargarFormasPago() {
    this.servicioFpago.obtenerTodosFpago().subscribe({
      next: (resp: any) => {
        const rows = Array.isArray(resp?.data) ? resp.data : [];
        this.mapaFormasPago.clear();
        rows.forEach((fp: any) => {
          const codigo = String(fp?.fp_codfpago ?? '').trim();
          if (codigo) {
            this.mapaFormasPago.set(codigo, String(fp?.fp_descfpago || codigo).trim());
          }
        });
        this.detalles = this.detalles.map((d) => ({
          ...d,
          descfpago: this.obtenerDescripcionFpago(d.codfpago),
        }));
        this.calcularTotales();
      },
      error: (err: any) => {
        console.error('Error al cargar formas de pago', err);
      },
    });
  }

  obtenerDescripcionFpago(codigo: any): string {
    const key = String(codigo ?? '').trim();
    if (!key) return 'Sin forma de pago';
    return this.mapaFormasPago.get(key) || `Forma ${key}`;
  }

  buscarChoferPorNombre(valor: string) {
    this.searchSubject.next(valor);
  }

  ejecutarBusquedaChofer(valor: string) {
    const termino = (valor || '').trim();
    if (!termino) {
      this.mostrarListaChoferes = false;
      this.choferesEncontrados = [];
      this.mostrarModalChofer = false;
      this.listaChoferesEncontrados = [];
      return;
    }

    // No activamos cargando global para no bloquear la UI al escribir
    // this.cargando = true; 
    
    this.mostrarListaChoferes = false;
    this.choferesEncontrados = [];
    this.servicioChofer.buscarTodosChofer(1, 20, termino).subscribe({
      next: (resp: any) => {
        const lista = resp?.data || resp || [];
        if (!Array.isArray(lista) || lista.length === 0) {
          // No mostramos mensaje de error en búsqueda iterativa para no molestar
          // this.mostrarMensaje('No se encontraron choferes con ese nombre');
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
        // this.mostrarMensaje('Error al buscar chofer por nombre');
      },
      complete: () => {
        // this.cargando = false;
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
                pagoFactura === 'P' ||
                pagoFactura === 'S';
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
                codfpago: String(f?.fa_codfpago ?? det?.codfpago ?? '').trim(),
                descfpago: this.obtenerDescripcionFpago(
                  f?.fa_codfpago ?? det?.codfpago
                ),
                fa_status: estadoFactura,
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

  obtenerTipoFactura(detalle: DetalleSalidaCaja): string {
    const status = String(detalle?.fa_status || '').trim().toUpperCase();
    if (status === 'C') return 'Conduce';
    if (status === 'A') return 'Factura';
    if (status === 'P') return 'Pendiente';
    return '';
  }

  obtenerClaseTipoFactura(detalle: DetalleSalidaCaja): string {
    const status = String(detalle?.fa_status || '').trim().toUpperCase();
    if (status === 'C') return 'bg-warning text-dark';
    if (status === 'A') return 'bg-success';
    if (status === 'P') return 'bg-secondary';
    return 'bg-light text-muted border';
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
    this.totalNoGestionable = this.detalles.reduce(
      (sum, d) => sum + (d.pagadoOriginal ? Number(d.valFact) || 0 : 0),
      0
    );
    this.totalPagado = this.detalles.reduce(
      (sum, d) =>
        sum + (!d.pagadoOriginal && d.pagado ? Number(d.valFact) || 0 : 0),
      0
    );
    this.totalPendiente = this.detalles.reduce(
      (sum, d) =>
        sum + (!d.pagadoOriginal && !d.pagado ? Number(d.valFact) || 0 : 0),
      0
    );
    const grupos = new Map<string, TotalPorFormaPago>();

    this.detalles
      .filter((d) => !d.pagadoOriginal && d.pagado)
      .forEach((d) => {
        const codigo = String(d.codfpago || '').trim() || 'SIN_FPAGO';
        const descripcion =
          codigo === 'SIN_FPAGO'
            ? 'Sin forma de pago'
            : d.descfpago || this.obtenerDescripcionFpago(codigo);
        const actual =
          grupos.get(codigo) || {
            codigo,
            descripcion,
            cantidad: 0,
            total: 0,
          };

        actual.cantidad += 1;
        actual.total += Number(d.valFact) || 0;
        grupos.set(codigo, actual);
      });

    this.cobradoPorFormaPago = Array.from(grupos.values()).sort((a, b) =>
      a.descripcion.localeCompare(b.descripcion)
    );
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
      (sum, d) =>
        sum + (!d.pagadoOriginal && d.pagado ? Number(d.valFact) || 0 : 0),
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
      status: 'C',
    }));

    const payload = {
      ...this.salidaActual,
      valPagado,
      status: 'C',
      detalles: detallesPayload,
    };

    const cobroObservable = this.servicioSalida.editarSalida(Number(this.salidaActual.id), payload);

    let facturasParaActualizar: any[] = [];

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

    facturasParaActualizar = this.detalles.map((d) => ({
      fa_codFact: d.codFact,
      fa_fpago: 'P',
      fa_entrega: 'S',
    }));

    const observables: Observable<any>[] = [cobroObservable];

    if (facturasParaActualizar.length > 0) {
      observables.push(
        this.servicioFacturacion.actualizarPagoYEntrega(facturasParaActualizar)
      );
    }

    forkJoin(observables).subscribe({
      next: () => {
        this.ultimoControlImpresion = this.crearDatosControlImpresion(payload);
        this.resetChofer();
        this.cargando = false;
        this.guardando = false;
        this.mostrarMensaje(
          'Cobro guardado correctamente. El chofer quedÃ³ libre para otra salida.',
          'success'
        );
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

  private crearDatosControlImpresion(payload?: any): any {
    return {
      salida: payload || this.salidaActual,
      chofer: this.nomChofer || payload?.nomChofer || payload?.nomchofer || '',
      codChofer: this.codChofer || payload?.codChofer || payload?.codchofer || '',
      detalles: this.detalles.map((d) => ({ ...d })),
      resumen: this.cobradoPorFormaPago.map((r) => ({ ...r })),
      totalSalida: this.totalSalida,
      totalPagado: this.totalPagado,
      totalPendiente: this.totalPendiente,
      totalNoGestionable: this.totalNoGestionable,
      fecha: new Date(),
    };
  }

  imprimirControlCobro() {
    const data = this.salidaActual
      ? this.crearDatosControlImpresion()
      : this.ultimoControlImpresion;

    if (!data) {
      this.mostrarMensaje('No hay control disponible para imprimir.', 'warning', true);
      return;
    }

    const formatoMoneda = new Intl.NumberFormat('es-DO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const fmt = (value: any) => formatoMoneda.format(Number(value) || 0);
    const formatDate = (value: any) => {
      const date = value instanceof Date ? value : new Date(value || new Date());
      if (isNaN(date.getTime())) return '';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 297],
    });
    const left = 5;
    const right = 75;
    const center = 40;
    let y = 8;

    const line = () => {
      doc.line(left, y, right, y);
      y += 4;
    };
    const centerText = (text: string, size = 8, bold = false) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.text(text, center, y, { align: 'center', maxWidth: 70 });
      y += 4;
    };

    centerText('CONTROL DE COBRO', 10, true);
    centerText(`Salida: ${data.salida?.codSalida || data.salida?.codsalida || ''}`, 8);
    centerText(`Fecha: ${formatDate(data.fecha)}`, 8);
    line();

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Chofer: ${data.chofer}`, left, y, { maxWidth: 70 });
    y += 5;
    doc.text(`Codigo: ${data.codChofer}`, left, y);
    y += 5;
    line();

    doc.setFont('helvetica', 'bold');
    doc.text('Resumen a pagar', left, y);
    y += 5;
    doc.setFont('helvetica', 'normal');

    if (data.resumen.length) {
      data.resumen.forEach((r: TotalPorFormaPago) => {
        doc.text(`${r.descripcion} (${r.cantidad})`, left, y, { maxWidth: 42 });
        doc.text(fmt(r.total), right, y, { align: 'right' });
        y += 5;
      });
    } else {
      doc.text('No hay cobros gestionados en esta salida.', left, y, { maxWidth: 70 });
      y += 6;
    }

    line();
    doc.setFont('helvetica', 'bold');
    doc.text('Total a pagar:', left, y);
    doc.text(fmt(data.totalPagado), right, y, { align: 'right' });
    y += 5;
    doc.setFont('helvetica', 'normal');
    if (data.totalNoGestionable > 0) {
      doc.text('Facturas ya pagadas:', left, y);
      doc.text(fmt(data.totalNoGestionable), right, y, { align: 'right' });
      y += 5;
    }

    line();
    doc.setFont('helvetica', 'bold');
    doc.text('Facturas', left, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    data.detalles.forEach((d: DetalleSalidaCaja) => {
      if (y > 275) {
        doc.addPage([80, 297], 'portrait');
        y = 8;
      }
      doc.text(String(d.codFact), left, y);
      doc.text(fmt(d.valFact), right, y, { align: 'right' });
      y += 4;
      const estado = d.pagadoOriginal ? 'Ya pagada' : 'Cobrada en salida';
      doc.text(`${d.descfpago || 'Sin forma'} - ${estado}`, left, y, { maxWidth: 70 });
      y += 5;
    });

    y += 8;
    doc.line(10, y, 70, y);
    y += 5;
    doc.text('Firma recibido', center, y, { align: 'center' });

    const blob = doc.output('blob');
    this.printingService.printBlob(blob, 'ticket');
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
