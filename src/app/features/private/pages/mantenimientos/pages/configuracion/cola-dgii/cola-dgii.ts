import { Component, OnDestroy, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FacturaDgiiService } from 'src/app/core/services/facturacion/factura/factura-dgii.service';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import Swal from 'sweetalert2';

interface LogColaDgii {
  fecha: Date;
  factura: string;
  estado: 'OK' | 'ERROR' | 'INFO';
  mensaje: string;
}

@Component({
  selector: 'app-cola-dgii',
  templateUrl: './cola-dgii.html',
  styleUrls: ['./cola-dgii.css'],
})
export class ColaDgiiPage implements OnInit, OnDestroy {
  intervaloMinutos = 10;
  cantidadFacturas = 5;
  usarDiaAnterior = true;
  fechaProceso = this.fechaAyer();
  activo = false;
  procesando = false;
  proximaEjecucion = '';
  ultimoMensaje = '';
  fechaUltimaConsulta = '';
  filtrosUltimaConsulta = '';
  pendientesEncontradas = 0;
  facturasConsultadas = 0;
  procesadasOk = 0;
  procesadasError = 0;
  logs: LogColaDgii[] = [];

  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly storageKey = 'cola_dgii_auto_config';

  constructor(
    private readonly facturacion: ServicioFacturacion,
    private readonly facturaDgii: FacturaDgiiService,
  ) {}

  ngOnInit(): void {
    this.cargarConfiguracion();
    if (this.usarDiaAnterior) this.fechaProceso = this.fechaAyer();
  }

  ngOnDestroy(): void {
    this.detener(false);
  }

  iniciar(): void {
    if (this.procesando) return;
    if (!this.validarConfiguracion()) return;

    this.activo = true;
    this.guardarConfiguracion();
    this.programarSiguiente();
    void this.procesarLote();
  }

  detener(mostrar = true): void {
    this.activo = false;
    this.proximaEjecucion = '';
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.guardarConfiguracion();
    if (mostrar) this.agregarLog('INFO', '', 'Proceso detenido.');
  }

  continuar(): void {
    this.iniciar();
  }

  procesarAhora(): void {
    if (!this.validarConfiguracion()) return;
    this.guardarConfiguracion();
    void this.procesarLote();
  }

  cambiarModoFecha(): void {
    if (this.usarDiaAnterior) this.fechaProceso = this.fechaAyer();
    this.guardarConfiguracion();
  }

  async consultarPendientes(): Promise<void> {
    if (!this.validarConfiguracion()) return;
    try {
      const facturas = await this.obtenerFacturasElegibles();
      this.pendientesEncontradas = facturas.length;
      this.agregarLog(
        'INFO',
        '',
        `Consulta lista para fecha ${this.formatoFechaVista(this.fechaUltimaConsulta)}: ${facturas.length} de ${this.facturasConsultadas} factura(s) cumplen las condiciones.`,
      );
    } catch (error: any) {
      this.agregarLog('ERROR', '', this.mensajeError(error));
      Swal.fire('Error', this.mensajeError(error), 'error');
    }
  }

  private programarSiguiente(): void {
    if (this.timer) clearInterval(this.timer);
    const ms = Math.max(1, Number(this.intervaloMinutos) || 1) * 60_000;
    this.proximaEjecucion = this.formatoFechaHora(new Date(Date.now() + ms));
    this.timer = setInterval(() => {
      if (!this.activo || this.procesando) return;
      this.proximaEjecucion = this.formatoFechaHora(new Date(Date.now() + ms));
      void this.procesarLote();
    }, ms);
  }

  private async procesarLote(): Promise<void> {
    if (this.procesando) return;

    this.procesando = true;
    this.ultimoMensaje = 'Buscando facturas para enviar a DGII...';

    try {
      const elegibles = await this.obtenerFacturasElegibles();
      const lote = elegibles.slice(0, Math.max(1, Number(this.cantidadFacturas) || 1));
      this.pendientesEncontradas = elegibles.length;

      if (!lote.length) {
        this.ultimoMensaje = `No hay facturas elegibles para procesar en fecha ${this.formatoFechaVista(this.fechaUltimaConsulta)}.`;
        this.agregarLog('INFO', '', this.ultimoMensaje);
        return;
      }

      for (const factura of lote) {
        const codigo = String(factura?.fa_codFact || factura?.fa_codfact || '').trim();
        try {
          this.ultimoMensaje = `Enviando factura ${codigo} a DGII...`;
          await this.facturaDgii.procesar(
            factura,
            (mensaje) => (this.ultimoMensaje = `${codigo}: ${mensaje}`),
            { imprimir: false },
          );
          this.procesadasOk += 1;
          this.agregarLog('OK', codigo, 'Enviada correctamente a DGII.');
        } catch (error: any) {
          this.procesadasError += 1;
          this.agregarLog('ERROR', codigo, this.mensajeError(error));
        }
      }
    } finally {
      this.procesando = false;
      if (this.activo) this.guardarConfiguracion();
    }
  }

  private async obtenerFacturasElegibles(): Promise<any[]> {
    const fecha = this.usarDiaAnterior ? this.fechaAyer() : this.fechaProceso;
    if (this.usarDiaAnterior) this.fechaProceso = fecha;
    this.fechaUltimaConsulta = fecha;
    this.filtrosUltimaConsulta = `fa_fecfact = ${fecha}, fa_status = C, fa_fpago = S, fa_despacho = S`;

    const resp: any = await firstValueFrom(
      this.facturacion.buscarFacturasPendientesDgii({
        fechaDesde: fecha,
        fechaHasta: fecha,
      }),
    );

    const rows = Array.isArray(resp?.data) ? resp.data : [];
    this.facturasConsultadas = rows.length;
    return rows
      .filter((factura: any) => this.esElegible(factura, fecha))
      .sort((a: any, b: any) =>
        String(a?.fa_codFact || a?.fa_codfact || '').localeCompare(
          String(b?.fa_codFact || b?.fa_codfact || ''),
        ),
      );
  }

  private esElegible(factura: any, fecha: string): boolean {
    const status = String(factura?.fa_status || '').trim().toUpperCase();
    const fpago = String(factura?.fa_fpago || '').trim().toUpperCase();
    const despacho = String(factura?.fa_despacho || '').trim().toUpperCase();
    const estadoDgii = String(factura?.estado_envio_dgii || factura?.estado_dgii || '').trim().toUpperCase();
    const facturaFecha = this.soloFecha(factura?.fa_fecFact || factura?.fa_fecfact);

    return (
      status === 'C' &&
      fpago === 'S' &&
      despacho === 'S' &&
      facturaFecha === fecha &&
      estadoDgii !== 'ACEPTADO'
    );
  }

  private validarConfiguracion(): boolean {
    if (!Number.isFinite(Number(this.intervaloMinutos)) || Number(this.intervaloMinutos) < 1) {
      Swal.fire('Aviso', 'El tiempo debe ser de 1 minuto o mayor.', 'warning');
      return false;
    }
    if (!Number.isFinite(Number(this.cantidadFacturas)) || Number(this.cantidadFacturas) < 1) {
      Swal.fire('Aviso', 'La cantidad de facturas debe ser 1 o mayor.', 'warning');
      return false;
    }
    if (!this.fechaProceso) {
      Swal.fire('Aviso', 'Debe indicar la fecha de las facturas a procesar.', 'warning');
      return false;
    }
    return true;
  }

  private cargarConfiguracion(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const cfg = JSON.parse(raw);
      this.intervaloMinutos = Number(cfg.intervaloMinutos || this.intervaloMinutos);
      this.cantidadFacturas = Number(cfg.cantidadFacturas || this.cantidadFacturas);
      this.usarDiaAnterior = cfg.usarDiaAnterior !== false;
      this.fechaProceso = String(cfg.fechaProceso || this.fechaProceso);
    } catch {
      localStorage.removeItem(this.storageKey);
    }
  }

  private guardarConfiguracion(): void {
    localStorage.setItem(
      this.storageKey,
      JSON.stringify({
        intervaloMinutos: Number(this.intervaloMinutos) || 10,
        cantidadFacturas: Number(this.cantidadFacturas) || 5,
        usarDiaAnterior: this.usarDiaAnterior,
        fechaProceso: this.fechaProceso,
      }),
    );
  }

  private agregarLog(estado: LogColaDgii['estado'], factura: string, mensaje: string): void {
    this.logs = [{ fecha: new Date(), factura, estado, mensaje }, ...this.logs].slice(0, 80);
  }

  private fechaAyer(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return this.soloFecha(d);
  }

  private soloFecha(value: any): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value || '').substring(0, 10);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private formatoFechaHora(date: Date): string {
    return date.toLocaleString('es-DO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatoFechaVista(value: any): string {
    const fecha = this.soloFecha(value);
    const [year, month, day] = fecha.split('-');
    if (!year || !month || !day) return String(value || '');
    return `${day}/${month}/${year}`;
  }

  private mensajeError(error: any): string {
    return String(
      error?.message ||
        error?.error?.message ||
        error?.details ||
        error?.hint ||
        error ||
        'Error procesando factura.',
    );
  }
}
