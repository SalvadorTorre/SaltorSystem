import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import Swal from 'sweetalert2';
import {
  ConcursoData,
  EstadoConcurso,
  RangoConcurso,
} from 'src/app/core/services/mantenimientos/concurso';
import { ServicioConcurso } from 'src/app/core/services/mantenimientos/concurso/concurso.service';
import { PrintingService } from 'src/app/core/services/utils/printing.service';

@Component({
  selector: 'app-concursos',
  templateUrl: './concursos.html',
  styleUrls: ['./concursos.css'],
})
export class ConcursosPage implements OnInit {
  @ViewChild('nombreInput') nombreInput?: ElementRef<HTMLInputElement>;

  concursos: ConcursoData[] = [];
  actual: ConcursoData = this.nuevoRegistro();
  cargando = false;
  guardando = false;
  busqueda = '';
  alcanceSucursal: 'todas' | 'sucursal' = 'todas';

  /** Simulador: monto de factura de prueba. */
  montoPrueba: number | null = 5000;

  readonly formatoMoneda = new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  });

  /** Generar / reimprimir boletos de una factura ya cobrada. */
  facturaBoletos = '';
  procesandoBoletos = false;

  constructor(
    private concursoSrv: ServicioConcurso,
    private printingService: PrintingService,
  ) {}

  generarBoletosDeFactura(): void {
    const codfact = String(this.facturaBoletos || '').trim();
    if (!codfact) {
      Swal.fire('Factura requerida', 'Escriba el número de la factura.', 'warning');
      return;
    }
    this.procesandoBoletos = true;
    this.concursoSrv.generarBoletosFactura(codfact).subscribe({
      next: async (resultado) => {
        this.procesandoBoletos = false;
        const concursos = (resultado.concursos || []).filter((c) => c.numeros.length > 0);
        if (!concursos.length) {
          Swal.fire(
            'Sin boletos',
            'Esta factura no cumple las condiciones de ningún concurso activo y vigente.',
            'info',
          );
          return;
        }
        const detalle = concursos
          .map((c) => {
            const nums = c.numeros.map((n) => String(n).padStart(6, '0')).join(', ');
            return `<b>${this.escape(c.nombre)}</b>: ${nums}${c.nuevos ? '' : ' <small>(ya entregados, reimpresión)</small>'}`;
          })
          .join('<br>');
        const res = await Swal.fire({
          title: 'Boletos de la factura',
          html: detalle,
          icon: 'success',
          showCancelButton: true,
          confirmButtonText: 'Imprimir',
          cancelButtonText: 'Cerrar',
        });
        this.cargar();
        if (res.isConfirmed) {
          // Abrir la ventana en el mismo clic para que el navegador no la bloquee.
          this.printingService.reservarVentanaImpresion();
          try {
            await this.printingService.imprimirBoletosConcurso80mm({ ...resultado, concursos });
          } catch (error) {
            Swal.fire('No se pudo imprimir', this.extraerError(error), 'error');
          }
        }
        this.facturaBoletos = '';
      },
      error: (err) => {
        this.procesandoBoletos = false;
        Swal.fire('Error', this.extraerError(err), 'error');
      },
    });
  }

  private escape(value: any): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  ngOnInit(): void {
    this.cargar();
    this.actualizarNombreEmpresa();
  }

  /** Nombres de empresa por codigo (para el formulario y el listado). */
  nombresEmpresa: Record<string, string> = {};

  nombreDeEmpresa(codigo: string | null | undefined): string {
    const cod = String(codigo || '').trim().toUpperCase();
    if (!cod) return '';
    if (!(cod in this.nombresEmpresa)) {
      this.nombresEmpresa[cod] = '';
      this.concursoSrv.nombreEmpresa(cod).subscribe((nombre) => {
        this.nombresEmpresa = { ...this.nombresEmpresa, [cod]: nombre };
      });
    }
    return this.nombresEmpresa[cod] || '';
  }

  actualizarNombreEmpresa(): void {
    this.actual.codempresa = String(this.actual.codempresa || '').trim().toUpperCase();
    this.nombreDeEmpresa(this.actual.codempresa);
  }

  get editando(): boolean {
    return !!this.actual.id;
  }

  get totalVigentes(): number {
    return this.concursos.filter((c) => this.estado(c) === 'VIGENTE').length;
  }

  get totalActivos(): number {
    return this.concursos.filter((c) => c.activo).length;
  }

  get filtrados(): ConcursoData[] {
    const q = this.normalizar(this.busqueda);
    if (!q) return this.concursos;
    return this.concursos.filter((c) =>
      this.normalizar(`${c.nombre} ${c.tipo} ${c.premios} ${c.codempresa}`).includes(q),
    );
  }

  get boletosPrueba(): number {
    return this.concursoSrv.calcularBoletos(this.actual, Number(this.montoPrueba) || 0);
  }

  /** Ejemplos de la regla actual para mostrar al usuario. */
  get ejemplosRegla(): { monto: number; boletos: number }[] {
    const base =
      this.actual.modo === 'RANGO'
        ? this.concursoSrv.rangosOrdenados(this.actual.rangos).map((r) => r.desde)
        : [Number(this.actual.monto_por_boleto) || 0].filter((m) => m > 0);
    const montos = new Set<number>();
    base.forEach((m) => {
      montos.add(m);
      montos.add(m * 2);
    });
    if (this.actual.monto_minimo > 0) montos.add(this.actual.monto_minimo);
    return Array.from(montos)
      .filter((m) => m > 0)
      .sort((a, b) => a - b)
      .slice(0, 6)
      .map((monto) => ({ monto, boletos: this.concursoSrv.calcularBoletos(this.actual, monto) }));
  }

  cargar(): void {
    this.cargando = true;
    this.concursoSrv.listar().subscribe({
      next: (rows) => {
        this.concursos = rows;
        this.cargando = false;
      },
      error: (err) => {
        this.cargando = false;
        Swal.fire('Error', this.extraerError(err), 'error');
      },
    });
  }

  estado(c: ConcursoData): EstadoConcurso {
    return this.concursoSrv.estado(c);
  }

  etiquetaEstado(c: ConcursoData): string {
    switch (this.estado(c)) {
      case 'VIGENTE':
        return 'Vigente';
      case 'PROGRAMADO':
        return 'Programado';
      case 'FINALIZADO':
        return 'Finalizado';
      default:
        return 'Inactivo';
    }
  }

  describirRegla(c: ConcursoData): string {
    const base = c.base_calculo === 'SUBTOTAL' ? ' (sin ITBIS)' : '';
    let texto = '';
    if (c.modo === 'RANGO') {
      const escala = this.concursoSrv.rangosOrdenados(c.rangos);
      texto = escala.length
        ? escala
            .map((r) => `desde ${this.dinero(r.desde)}: ${r.boletos} boleto${r.boletos === 1 ? '' : 's'}`)
            .join(' · ')
        : 'Sin escala definida';
    } else {
      texto = `1 boleto por cada ${this.dinero(c.monto_por_boleto)}`;
    }
    if (c.monto_minimo > 0) texto += ` · mínimo ${this.dinero(c.monto_minimo)}`;
    if (c.max_boletos_factura) texto += ` · máx. ${c.max_boletos_factura} por factura`;
    texto += c.solo_clientes_registrados ? ' · solo clientes registrados' : ' · todos los clientes';
    return texto + base;
  }

  agregarRango(): void {
    const escala = this.actual.rangos || [];
    const ultimo = escala[escala.length - 1];
    this.actual.rangos = [
      ...escala,
      {
        desde: ultimo ? (Number(ultimo.desde) || 0) * 2 || 5000 : 5000,
        boletos: ultimo ? (Number(ultimo.boletos) || 0) + 1 : 1,
      },
    ];
  }

  quitarRango(index: number): void {
    this.actual.rangos = this.actual.rangos.filter((_, i) => i !== index);
  }

  trackRango(index: number): number {
    return index;
  }

  onModoChange(): void {
    if (this.actual.modo === 'RANGO' && !this.actual.rangos.length) {
      this.actual.rangos = [{ desde: 5000, boletos: 1 }];
    }
  }

  onAlcanceSucursalChange(): void {
    if (this.alcanceSucursal === 'todas') {
      this.actual.codsucursal = null;
    } else if (!this.actual.codsucursal) {
      this.actual.codsucursal = this.concursoSrv.tenant().sucursal || null;
    }
  }

  guardar(form: NgForm): void {
    const error = this.validar();
    if (error) {
      Swal.fire('Revise los datos', error, 'warning');
      return;
    }
    if (this.alcanceSucursal === 'todas') this.actual.codsucursal = null;

    this.guardando = true;
    this.concursoSrv.guardar(this.actual).subscribe({
      next: () => {
        this.guardando = false;
        Swal.fire('Guardado', 'El concurso fue guardado correctamente.', 'success');
        this.nuevo(form);
        this.cargar();
      },
      error: (err) => {
        this.guardando = false;
        Swal.fire('Error', this.extraerError(err), 'error');
      },
    });
  }

  editar(c: ConcursoData): void {
    this.actual = {
      ...c,
      rangos: (c.rangos || []).map((r) => ({ ...r })),
      descripcion: c.descripcion || '',
      premios: c.premios || '',
    };
    this.alcanceSucursal = c.codsucursal ? 'sucursal' : 'todas';
    setTimeout(() => this.nombreInput?.nativeElement?.focus());
  }

  async cambiarActivo(c: ConcursoData): Promise<void> {
    if (!c.id) return;
    const activar = !c.activo;
    const res = await Swal.fire({
      title: activar ? 'Activar concurso' : 'Desactivar concurso',
      text: activar
        ? `¿Activar "${c.nombre}"? Del ${this.fechaCorta(c.fecha_inicio)} al ${this.fechaCorta(c.fecha_fin)} las facturas que cumplan las condiciones ganarán boletos.`
        : `¿Desactivar "${c.nombre}"? Las facturas dejarán de ganar boletos.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: activar ? 'Sí, activar' : 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
    });
    if (!res.isConfirmed) return;
    this.concursoSrv.cambiarActivo(c.id, activar).subscribe({
      next: (row) => {
        this.concursos = this.concursos.map((x) => (x.id === row.id ? row : x));
        if (this.actual.id === row.id) this.actual.activo = row.activo;
      },
      error: (err) => Swal.fire('Error', this.extraerError(err), 'error'),
    });
  }

  async eliminar(c: ConcursoData): Promise<void> {
    if (!c.id) return;
    const res = await Swal.fire({
      title: 'Eliminar concurso',
      text: `¿Eliminar "${c.nombre}"? Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });
    if (!res.isConfirmed) return;
    this.concursoSrv.eliminar(c.id).subscribe({
      next: () => this.cargar(),
      error: (err) => Swal.fire('Error', this.extraerError(err), 'error'),
    });
  }

  nuevo(form?: NgForm): void {
    const registro = this.nuevoRegistro();
    this.alcanceSucursal = 'todas';
    this.actual = registro;
    form?.resetForm(registro);
    this.actual = registro;
    setTimeout(() => this.nombreInput?.nativeElement?.focus());
  }

  dinero(valor: any): string {
    return this.formatoMoneda.format(Number(valor) || 0);
  }

  fechaCorta(iso: string): string {
    const [y, m, d] = String(iso || '').split('-');
    return y && m && d ? `${d}/${m}/${y}` : '';
  }

  alcance(c: ConcursoData): string {
    const nombre = this.nombreDeEmpresa(c.codempresa);
    return `${c.codempresa}${nombre ? ` - ${nombre}` : ''}${c.codsucursal ? ` / Sucursal ${c.codsucursal}` : ' / Todas las sucursales'}`;
  }

  private validar(): string {
    const c = this.actual;
    if (!String(c.nombre || '').trim()) return 'Escriba el nombre del concurso.';
    if (!String(c.codempresa || '').trim()) return 'No se encontró la empresa del concurso.';
    if (!c.fecha_inicio || !c.fecha_fin) return 'Indique la fecha de inicio y la fecha de fin.';
    if (c.fecha_fin < c.fecha_inicio) return 'La fecha de fin no puede ser menor que la fecha de inicio.';
    if (this.alcanceSucursal === 'sucursal' && !(Number(c.codsucursal) > 0)) {
      return 'Indique el código de la sucursal.';
    }
    if (!c.aplica_contado && !c.aplica_credito) {
      return 'Debe aplicar al menos a facturas de contado o de crédito.';
    }
    if (c.modo === 'MULTIPLO' && !(Number(c.monto_por_boleto) > 0)) {
      return 'Indique cada cuántos pesos se gana un boleto.';
    }
    if (c.modo === 'RANGO') {
      const escala = c.rangos || [];
      if (!escala.length) return 'Agregue al menos un rango de montos.';
      if (escala.some((r) => !(Number(r.desde) > 0) || !(Number(r.boletos) >= 1))) {
        return 'Cada rango debe tener un monto mayor que 0 y al menos 1 boleto.';
      }
      const montos = escala.map((r) => Number(r.desde));
      if (new Set(montos).size !== montos.length) return 'Hay rangos con el mismo monto.';
    }
    if (c.max_boletos_factura != null && String(c.max_boletos_factura) !== '' && Number(c.max_boletos_factura) < 0) {
      return 'El máximo de boletos por factura no puede ser negativo.';
    }
    return '';
  }

  private nuevoRegistro(): ConcursoData {
    const hoy = new Date();
    const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, hoy.getDate());
    return {
      codempresa: this.concursoSrv.tenant().empresa,
      codsucursal: null,
      nombre: '',
      tipo: 'RIFA',
      descripcion: '',
      premios: '',
      fecha_inicio: this.concursoSrv.fechaIso(hoy),
      fecha_fin: this.concursoSrv.fechaIso(fin),
      activo: false,
      modo: 'MULTIPLO',
      monto_por_boleto: 5000,
      monto_minimo: 0,
      max_boletos_factura: null,
      rangos: [] as RangoConcurso[],
      base_calculo: 'TOTAL',
      aplica_contado: true,
      aplica_credito: true,
      solo_pagadas: true,
      solo_clientes_registrados: false,
    };
  }

  private extraerError(err: any): string {
    return String(err?.message || err?.error?.message || err || 'No se pudo completar la operación.');
  }

  private normalizar(value: any): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim()
      .toLowerCase();
  }
}
