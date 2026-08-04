import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { ServicioConfiguracionGlobal } from 'src/app/core/services/mantenimientos/configuracion-global/configuracion-global.service';
import { GastosMenoresService } from 'src/app/core/services/contabilidad/gastos-menores/gastos-menores.service';
import Swal from 'sweetalert2';

interface GastoMenorLinea {
  id: number;
  descripcion: string;
  cantidad: number;
  precio: number;
  monto: number;
}

@Component({
  selector: 'app-gastos-menores',
  templateUrl: './gastos-menores.html',
  styleUrls: ['./gastos-menores.css'],
})
export class GastosMenoresComponent implements OnInit {
  private nextId = 2;
  pestanaActiva: 'nuevo' | 'consulta' = 'nuevo';
  enviando = false;
  cargandoConsulta = false;
  reenviandoNumero = '';
  filtroConsulta = '';
  gastosConsulta: any[] = [];
  estado = 'Sin enviar';
  trackId = '';
  respuesta = '';
  form = {
    numero: '',
    encf: '',
    fecha: new Date().toISOString().slice(0, 10),
    fechaVencimiento: '',
  };
  lineas: GastoMenorLinea[] = [this.crearLinea(1)];

  constructor(
    private facturacion: ServicioFacturacion,
    private configuracion: ServicioConfiguracionGlobal,
    private gastosMenores: GastosMenoresService,
  ) {}

  ngOnInit(): void {
    void this.generarNumeroControl();
  }

  get total(): number {
    return this.redondear(this.lineas.reduce((sum, line) => sum + line.monto, 0), 2);
  }

  get gastosFiltrados(): any[] {
    const filtro = String(this.filtroConsulta || '').trim().toLowerCase();
    if (!filtro) return this.gastosConsulta;
    return this.gastosConsulta.filter((gasto) => [
      gasto?.gm_numero,
      gasto?.gm_encf,
      gasto?.gm_estado_dgii,
      gasto?.gm_track_id,
      gasto?.gm_usuario,
    ].some((value) => String(value || '').toLowerCase().includes(filtro)));
  }

  cambiarPestana(pestana: 'nuevo' | 'consulta'): void {
    this.pestanaActiva = pestana;
    if (pestana === 'consulta') this.cargarConsulta();
  }

  cargarConsulta(): void {
    this.cargandoConsulta = true;
    this.gastosMenores.listar().subscribe({
      next: (response) => {
        this.gastosConsulta = Array.isArray(response?.data) ? response.data : [];
        this.cargandoConsulta = false;
      },
      error: async (error) => {
        this.gastosConsulta = [];
        this.cargandoConsulta = false;
        await Swal.fire('Error', String(error?.message || 'No se pudieron cargar los gastos menores.'), 'error');
      },
    });
  }

  puedeReenviar(gasto: any): boolean {
    const estado = String(gasto?.gm_estado_dgii || '').trim().toLowerCase();
    return !estado.includes('acept') && !!gasto?.gm_request_json;
  }

  claseEstadoConsulta(estadoValue: any): string {
    const estado = String(estadoValue || '').trim().toLowerCase();
    if (estado.includes('acept')) return 'text-bg-success';
    if (estado.includes('rechaz') || estado.includes('error')) return 'text-bg-danger';
    if (estado.includes('pend')) return 'text-bg-warning';
    return 'text-bg-secondary';
  }

  async reenviarDgii(gasto: any): Promise<void> {
    const numero = String(gasto?.gm_numero || '').trim();
    let escenario = gasto?.gm_request_json;
    if (typeof escenario === 'string') {
      try { escenario = JSON.parse(escenario); } catch { escenario = null; }
    }
    if (!numero || !escenario || typeof escenario !== 'object') {
      await Swal.fire('Faltan datos', 'El gasto no tiene una solicitud DGII guardada para reenviar.', 'warning');
      return;
    }

    const confirmacion = await Swal.fire({
      title: 'Reenviar a DGII',
      text: `Se reenviara el gasto menor ${numero}.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Reenviar',
      cancelButtonText: 'Cancelar',
    });
    if (!confirmacion.isConfirmed) return;

    this.reenviandoNumero = numero;
    try {
      await firstValueFrom(this.gastosMenores.actualizarResultado(numero, {
        encf: gasto?.gm_encf,
        estado: 'PENDIENTE',
        requestJson: escenario,
      }));
      const rnc = this.limpiarRnc(localStorage.getItem('rnc_empresa'));
      const response = await firstValueFrom(
        this.configuracion.enviarDgiiDirectCert([escenario], rnc),
      );
      const raw = response?.data ?? response;
      const data = raw?.data?.resultados?.[0] || raw?.resultados?.[0] || raw?.data || raw;
      const estado = String(data?.estado || data?.status || 'Enviado');
      const trackId = String(data?.trackId || data?.track_id || '');
      await firstValueFrom(this.gastosMenores.actualizarResultado(numero, {
        encf: gasto?.gm_encf,
        estado,
        trackId,
        requestJson: escenario,
        responseJson: raw,
      }));
      await Swal.fire('Completado', `Gasto menor ${numero} reenviado a DGII.`, 'success');
    } catch (error: any) {
      const details = error?.dgiiResponse || error?.details || error?.error || error;
      try {
        await firstValueFrom(this.gastosMenores.actualizarResultado(numero, {
          encf: gasto?.gm_encf,
          estado: 'Error',
          requestJson: escenario,
          responseJson: details,
        }));
      } catch (updateError) {
        console.error('No se pudo guardar el error del reenvio:', updateError);
      }
      await Swal.fire('Error DGII', String(error?.message || 'No se pudo reenviar el E43.'), 'error');
    } finally {
      this.reenviandoNumero = '';
      this.cargarConsulta();
    }
  }

  agregarLinea(): void {
    this.lineas = [...this.lineas, this.crearLinea(this.nextId++)];
  }

  quitarLinea(id: number): void {
    if (this.lineas.length === 1) return;
    this.lineas = this.lineas.filter((line) => line.id !== id);
  }

  recalcular(linea: GastoMenorLinea): void {
    const monto = Math.max(0, Number(linea.cantidad || 0) * Number(linea.precio || 0));
    linea.monto = this.redondear(monto, 2);
  }

  async enviarDgii(): Promise<void> {
    const errores = this.validar();
    if (errores.length) {
      await Swal.fire('Faltan datos', errores.join('<br>'), 'warning');
      return;
    }

    this.enviando = true;
    try {
      if (!this.form.encf) {
        const reserva = await firstValueFrom(this.facturacion.reservarEncf('43'));
        this.form.encf = String(reserva?.data?.ncf || reserva?.ncf || '').trim();
        this.form.fechaVencimiento = this.fechaInput(
          reserva?.data?.fechaVencimiento || reserva?.fechaVencimiento || this.form.fechaVencimiento,
        );
        if (!this.form.encf) throw new Error('No se pudo reservar la secuencia E43.');
      }

      const escenario = this.construirEscenario();
      const lineasValidas = this.lineas
        .filter((linea) => linea.descripcion.trim() && linea.cantidad > 0 && linea.precio > 0)
        .map((linea) => ({
          descripcion: linea.descripcion.trim(),
          cantidad: Number(linea.cantidad),
          precio: Number(linea.precio),
          monto: Number(linea.monto),
        }));
      await firstValueFrom(this.gastosMenores.guardar({
        numero: this.form.numero,
        encf: this.form.encf,
        fecha: this.form.fecha,
        fechaVencimiento: this.form.fechaVencimiento,
        total: this.total,
        estadoDgii: 'PENDIENTE',
        requestJson: escenario,
        lineas: lineasValidas,
      }));
      const rnc = this.limpiarRnc(localStorage.getItem('rnc_empresa'));
      const response = await firstValueFrom(
        this.configuracion.enviarDgiiDirectCert([escenario], rnc),
      );
      const raw = response?.data ?? response;
      this.respuesta = JSON.stringify(raw, null, 2);
      const data = raw?.data?.resultados?.[0] || raw?.resultados?.[0] || raw?.data || raw;
      this.estado = String(data?.estado || data?.status || 'Enviado');
      this.trackId = String(data?.trackId || data?.track_id || '');
      await firstValueFrom(this.gastosMenores.actualizarResultado(this.form.numero, {
        encf: this.form.encf,
        estado: this.estado,
        trackId: this.trackId,
        requestJson: escenario,
        responseJson: raw,
      }));
      await Swal.fire(
        'Completado',
        `Gasto menor No. ${this.form.numero} (${this.form.encf}) enviado a DGII.`,
        'success',
      );
    } catch (error: any) {
      this.estado = 'Error';
      const details = error?.dgiiResponse || error?.details || error?.error || error;
      this.respuesta = JSON.stringify(details, null, 2);
      if (this.form.numero) {
        try {
          await firstValueFrom(this.gastosMenores.actualizarResultado(this.form.numero, {
            encf: this.form.encf,
            estado: 'Error',
            responseJson: details,
          }));
        } catch (updateError) {
          console.error('No se pudo guardar el error del gasto menor en Supabase:', updateError);
        }
      }
      await Swal.fire('Error DGII', String(error?.message || 'No se pudo enviar el E43.'), 'error');
    } finally {
      this.enviando = false;
    }
  }

  limpiar(): void {
    this.form = {
      numero: '', encf: '', fecha: new Date().toISOString().slice(0, 10), fechaVencimiento: '',
    };
    this.nextId = 2;
    this.lineas = [this.crearLinea(1)];
    this.estado = 'Sin enviar';
    this.trackId = '';
    this.respuesta = '';
    void this.generarNumeroControl();
  }

  private async generarNumeroControl(): Promise<void> {
    try {
      const response = await firstValueFrom(this.facturacion.reservarNumeroGastoMenor());
      this.form.numero = String(response?.data?.numero || response?.numero || '').trim();
      if (!this.form.numero) throw new Error('No se recibio el numero de gasto menor.');
    } catch (error: any) {
      this.form.numero = '';
      await Swal.fire(
        'No se pudo generar el numero',
        String(error?.message || 'No se pudo generar el numero de gasto menor.'),
        'error',
      );
    }
  }

  private construirEscenario(): any {
    const rncEmisor = this.limpiarRnc(localStorage.getItem('rnc_empresa'));
    const nombreEmisor = String(localStorage.getItem('nombre_empresa') || '').trim();
    const direccionEmisor = String(localStorage.getItem('direccion_empresa') || '').trim();
    const scenario: any = {
      Version: '1.0', TipoeCF: '43', ENCF: this.form.encf,
      FechaVencimientoSecuencia: this.fechaDgii(this.form.fechaVencimiento),
      RNCEmisor: rncEmisor,
      RazonSocialEmisor: nombreEmisor, NombreComercial: nombreEmisor,
      DireccionEmisor: direccionEmisor, FechaEmision: this.fechaDgii(this.form.fecha),
      MontoExento: this.total.toFixed(2), MontoTotal: this.total.toFixed(2),
    };
    this.lineas.filter((line) => line.descripcion.trim()).forEach((line, index) => {
      const n = index + 1;
      scenario[`NumeroLinea[${n}]`] = n;
      scenario[`IndicadorFacturacion[${n}]`] = '4';
      scenario[`NombreItem[${n}]`] = line.descripcion.trim();
      scenario[`IndicadorBienoServicio[${n}]`] = '2';
      scenario[`CantidadItem[${n}]`] = Number(line.cantidad).toFixed(2);
      scenario[`PrecioUnitarioItem[${n}]`] = Number(line.precio).toFixed(4);
      scenario[`MontoItem[${n}]`] = line.monto.toFixed(2);
    });
    Object.keys(scenario).forEach((key) => {
      if (scenario[key] === '' || scenario[key] === null || scenario[key] === undefined) delete scenario[key];
    });
    return scenario;
  }

  private validar(): string[] {
    const errors: string[] = [];
    if (!this.form.numero) errors.push('Numero de gasto menor requerido.');
    if (!this.limpiarRnc(localStorage.getItem('rnc_empresa'))) errors.push('RNC del emisor requerido.');
    if (!String(localStorage.getItem('nombre_empresa') || '').trim()) errors.push('Nombre del emisor requerido.');
    if (!String(localStorage.getItem('direccion_empresa') || '').trim()) errors.push('Direccion del emisor requerida.');
    if (!this.form.fecha) errors.push('Fecha de emision requerida.');
    if (!this.form.fechaVencimiento) errors.push('Fecha de vencimiento de la secuencia E43 requerida.');
    if (!this.lineas.some((line) => line.descripcion.trim() && line.cantidad > 0 && line.precio > 0)) {
      errors.push('Agregue al menos un gasto con descripcion, cantidad y precio.');
    }
    return errors;
  }

  private crearLinea(id: number): GastoMenorLinea {
    return { id, descripcion: '', cantidad: 1, precio: 0, monto: 0 };
  }

  private limpiarRnc(value: any): string { return String(value || '').replace(/[^0-9]/g, ''); }
  private redondear(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
  }
  private fechaDgii(value: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
  }
  private fechaInput(value: any): string {
    const text = String(value || '').trim().split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const match = /^(\d{2})[-/](\d{2})[-/](\d{4})$/.exec(text);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
  }
}
