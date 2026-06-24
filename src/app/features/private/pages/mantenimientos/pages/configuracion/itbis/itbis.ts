import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import Swal from 'sweetalert2';
import { ItbisData, ServicioItbis } from 'src/app/core/services/mantenimientos/itbis/itbis.service';

@Component({
  selector: 'app-config-itbis',
  templateUrl: './itbis.html',
  styleUrls: ['./itbis.css'],
})
export class ItbisPage implements OnInit {
  @ViewChild('codigoInput') codigoInput?: ElementRef<HTMLInputElement>;

  items: ItbisData[] = [];
  busqueda = '';
  filtroEstado = '';
  editandoId: number | null = null;
  cargando = false;

  actual: ItbisData = this.nuevoRegistro();

  constructor(private itbisSrv: ServicioItbis) {}

  ngOnInit(): void {
    this.cargarItems();
  }

  get filtrados(): ItbisData[] {
    const q = this.busqueda.trim().toLowerCase();
    return this.items.filter((item) => {
      const estadoOk = !this.filtroEstado || item.estado === this.filtroEstado;
      const textoOk =
        !q ||
        item.codigo.toLowerCase().includes(q) ||
        item.descripcion.toLowerCase().includes(q) ||
        String(item.nivel || '').toLowerCase().includes(q) ||
        String(item.porcentaje).includes(q);
      return estadoOk && textoOk;
    });
  }

  get porcentajeActual(): string {
    return Number(this.actual.porcentaje || 0).toFixed(2);
  }

  get permiteEditarPorcentajeMenos(): boolean {
    return Number(this.actual.porcentaje || 0) === 0;
  }

  cargarItems(): void {
    this.cargando = true;
    this.itbisSrv.buscarTodos().subscribe({
      next: (rows) => {
        this.items = rows.length ? rows : this.semilla();
        this.cargando = false;
      },
      error: () => {
        this.items = this.semilla();
        this.cargando = false;
      },
    });
  }

  guardar(form: NgForm): void {
    if (!form.valid || !this.actual.codigo.trim() || !this.actual.descripcion.trim()) {
      Swal.fire('Datos incompletos', 'Complete codigo, descripcion, porcentaje y fecha inicio.', 'warning');
      return;
    }

    if (this.existeNivelActivoRepetido()) {
      Swal.fire('Nivel repetido', `Ya existe un ITBIS activo para el nivel ${this.actual.nivel}.`, 'warning');
      return;
    }

    const payload = {
      ...this.actual,
      porcentaje: Number(this.actual.porcentaje || 0),
      porcentaje_menos: Number(this.actual.porcentaje_menos || 0),
      nivel: this.actual.nivel || 'General',
      estado: this.actual.estado || 'Activo',
      fecha_fin: this.actual.fecha_fin || null,
    };

    const request = this.editandoId
      ? this.itbisSrv.editar(this.editandoId, payload)
      : this.itbisSrv.guardar(payload);

    request.subscribe({
      next: () => {
        Swal.fire('Guardado', 'La tasa de ITBIS fue guardada correctamente.', 'success');
        this.nuevo(form);
        this.cargarItems();
      },
      error: (err) => {
        Swal.fire('Error', this.extraerError(err), 'error');
      },
    });
  }

  nuevo(form?: NgForm): void {
    const registro = this.nuevoRegistro();
    this.editandoId = null;
    this.actual = { ...registro };
    form?.resetForm();

    setTimeout(() => {
      this.actual = { ...registro };
      this.actualizarPorcentajeMenos();
      form?.resetForm({ ...this.actual });
      this.codigoInput?.nativeElement?.focus();
    });
  }

  editar(item: ItbisData): void {
    this.editandoId = item.id ?? null;
    this.actual = { ...item };
    this.actualizarPorcentajeMenos();
  }

  ver(item: ItbisData): void {
    Swal.fire({
      title: item.descripcion,
      html: `
        <div style="text-align:left">
          <p><b>Codigo:</b> ${this.escape(item.codigo)}</p>
          <p><b>Porcentaje:</b> ${this.formatoPorcentaje(item.porcentaje)}</p>
          <p><b>Nivel de uso:</b> ${this.escape(item.nivel || 'General')}</p>
          <p><b>Estado:</b> ${this.escape(item.estado)}</p>
          <p><b>Fecha inicio:</b> ${this.formatoFecha(item.fecha_inicio)}</p>
          <p><b>Fecha fin:</b> ${item.fecha_fin ? this.formatoFecha(item.fecha_fin) : '-'}</p>
        </div>
      `,
      confirmButtonText: 'Aceptar',
    });
  }

  eliminar(item: ItbisData): void {
    if (!item.id) {
      this.items = this.items.filter((row) => row.codigo !== item.codigo);
      return;
    }

    Swal.fire({
      title: 'Eliminar ITBIS',
      text: `Desea eliminar ${item.descripcion}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Si, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.itbisSrv.eliminar(item.id!).subscribe({
        next: () => this.cargarItems(),
        error: (err) => Swal.fire('Error', this.extraerError(err), 'error'),
      });
    });
  }

  cancelar(form: NgForm): void {
    this.nuevo(form);
  }

  formatoPorcentaje(value: any): string {
    return `${Number(value || 0).toFixed(2)}%`;
  }

  valorPorcentajeMenos(item: ItbisData): number {
    const guardado = Number(item.porcentaje_menos || 0);
    return guardado || this.calcularPorcentajeMenos(item.porcentaje);
  }

  formatoFecha(value: any): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('es-DO');
  }

  actualizarPorcentajeMenos(): void {
    if (this.permiteEditarPorcentajeMenos) {
      return;
    }

    this.actual.porcentaje_menos = this.calcularPorcentajeMenos(this.actual.porcentaje);
  }

  private nuevoRegistro(): ItbisData {
    const porcentaje = 18;
    return {
      codigo: '',
      descripcion: '',
      porcentaje,
      porcentaje_menos: this.calcularPorcentajeMenos(porcentaje),
      nivel: 'General',
      estado: 'Activo',
      fecha_inicio: new Date().toISOString().slice(0, 10),
      fecha_fin: null,
    };
  }

  private semilla(): ItbisData[] {
    return [
      { id: 0, codigo: 'ITBIS-01', descripcion: 'ITBIS General', porcentaje: 18, porcentaje_menos: this.calcularPorcentajeMenos(18), nivel: 'General', fecha_inicio: '2024-01-01', fecha_fin: null, estado: 'Activo' },
      { id: 0, codigo: 'ITBIS-02', descripcion: 'ITBIS Reducido', porcentaje: 16, porcentaje_menos: this.calcularPorcentajeMenos(16), nivel: 'Reducido', fecha_inicio: '2024-01-01', fecha_fin: null, estado: 'Activo' },
      { id: 0, codigo: 'ITBIS-03', descripcion: 'ITBIS 0% (Exento)', porcentaje: 0, porcentaje_menos: this.calcularPorcentajeMenos(0), nivel: 'Exento', fecha_inicio: '2024-01-01', fecha_fin: null, estado: 'Activo' },
    ];
  }

  private existeNivelActivoRepetido(): boolean {
    if (String(this.actual.estado || '').toLowerCase() !== 'activo') return false;
    const nivelActual = this.normalizar(this.actual.nivel || 'General');
    return this.items.some((item) => {
      const mismoRegistro = this.editandoId && item.id === this.editandoId;
      if (mismoRegistro) return false;
      return this.normalizar(item.estado) === 'activo' && this.normalizar(item.nivel || 'General') === nivelActual;
    });
  }

  private normalizar(value: any): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private calcularPorcentajeMenos(value: any): number {
    const porcentaje = Number(value || 0);
    const divisor = 1 + porcentaje / 100;
    return divisor ? Number((porcentaje / divisor).toFixed(4)) : 0;
  }

  private extraerError(err: any): string {
    return String(err?.error?.message || err?.message || err || 'No se pudo completar la operacion.');
  }

  private escape(value: any): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
