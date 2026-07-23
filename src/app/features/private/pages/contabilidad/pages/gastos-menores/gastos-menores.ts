import { Component } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { ServicioConfiguracionGlobal } from 'src/app/core/services/mantenimientos/configuracion-global/configuracion-global.service';
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
export class GastosMenoresComponent {
  private nextId = 2;
  enviando = false;
  estado = 'Sin enviar';
  trackId = '';
  respuesta = '';
  form = {
    encf: '',
    fecha: new Date().toISOString().slice(0, 10),
    fechaVencimiento: '',
  };
  lineas: GastoMenorLinea[] = [this.crearLinea(1)];

  constructor(
    private facturacion: ServicioFacturacion,
    private configuracion: ServicioConfiguracionGlobal,
  ) {}

  get total(): number {
    return this.redondear(this.lineas.reduce((sum, line) => sum + line.monto, 0), 2);
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
      const rnc = this.limpiarRnc(localStorage.getItem('rnc_empresa'));
      const response = await firstValueFrom(
        this.configuracion.enviarDgiiDirectCert([escenario], rnc),
      );
      const raw = response?.data ?? response;
      this.respuesta = JSON.stringify(raw, null, 2);
      const data = raw?.data?.resultados?.[0] || raw?.resultados?.[0] || raw?.data || raw;
      this.estado = String(data?.estado || data?.status || 'Enviado');
      this.trackId = String(data?.trackId || data?.track_id || '');
      await Swal.fire('Completado', `Gasto menor ${this.form.encf} enviado a DGII.`, 'success');
    } catch (error: any) {
      this.estado = 'Error';
      const details = error?.dgiiResponse || error?.details || error?.error || error;
      this.respuesta = JSON.stringify(details, null, 2);
      await Swal.fire('Error DGII', String(error?.message || 'No se pudo enviar el E43.'), 'error');
    } finally {
      this.enviando = false;
    }
  }

  limpiar(): void {
    this.form = {
      encf: '', fecha: new Date().toISOString().slice(0, 10), fechaVencimiento: '',
    };
    this.nextId = 2;
    this.lineas = [this.crearLinea(1)];
    this.estado = 'Sin enviar';
    this.trackId = '';
    this.respuesta = '';
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
