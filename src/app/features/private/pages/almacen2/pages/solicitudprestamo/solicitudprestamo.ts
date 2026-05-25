import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, filter, of, switchMap, tap } from 'rxjs';
import Swal from 'sweetalert2';
import { SolicitudPrestamoService } from 'src/app/core/services/almacen/solicitudprestamo/solicitudprestamo.service';
import {
  DetSolicitudPrestamoData,
  SolicitudPrestamoData,
} from 'src/app/core/services/almacen/solicitudprestamo';
import { ServicioEmpresa } from 'src/app/core/services/mantenimientos/empresas/empresas.service';
import {
  EmpresaModel,
  EmpresaModelData,
  SucursalesData,
} from 'src/app/core/services/mantenimientos/empresas';
import { ServicioProducto } from 'src/app/core/services/mantenimientos/producto/producto.service';
import { PrintingService } from 'src/app/core/services/utils/printing.service';

declare var $: any;

@Component({
  selector: 'app-solicitud-prestamo',
  templateUrl: './solicitudprestamo.html',
  styleUrls: ['./solicitudprestamo.css'],
})
export class SolicitudPrestamo implements OnInit {
  formulario!: FormGroup;
  solicitudes: SolicitudPrestamoData[] = [];
  detalle: DetSolicitudPrestamoData[] = [];
  detalleActual: DetSolicitudPrestamoData = this.nuevoDetalle();
  solicitudSeleccionada: SolicitudPrestamoData | null = null;
  tituloModal = 'Nueva Solicitud de Préstamo';
  modoConsulta = false;
  filtro = '';
  currentPage = 1;
  pageSize = 20;
  buscarEmpresaCliente = new FormControl('');
  buscarSucursalCliente = new FormControl('');
  resultadoEmpresas: EmpresaModelData[] = [];
  sucursalesCliente: SucursalesData[] = [];
  resultadoSucursales: SucursalesData[] = [];
  mostrarSucursalCliente = false;
  buscarCodigoMercancia = new FormControl('');
  buscarDescripcionMercancia = new FormControl('');
  resultadoProductos: any[] = [];

  constructor(
    private fb: FormBuilder,
    private solicitudService: SolicitudPrestamoService,
    private servicioEmpresa: ServicioEmpresa,
    private servicioProducto: ServicioProducto,
    private printingService: PrintingService
  ) {}

  ngOnInit(): void {
    this.crearFormulario();
    this.configurarBusquedasCliente();
    this.configurarBusquedaProducto();
    this.listar(1);
  }

  private configurarBusquedasCliente(): void {
    this.buscarEmpresaCliente.valueChanges
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        tap(() => (this.resultadoEmpresas = [])),
        filter((query) => !this.modoConsulta && String(query || '').trim().length > 0),
        switchMap((query) =>
          this.servicioEmpresa.buscarPorNombreEmpresa(String(query || '').trim()).pipe(
            catchError((err) => {
              this.mostrarError('Error consultando empresas', err);
              return of({
                status: 'error',
                code: 0,
                message: err?.message || 'No se pudieron consultar empresas.',
                data: [],
              } satisfies EmpresaModel);
            })
          )
        )
      )
      .subscribe((response: EmpresaModel) => {
        this.resultadoEmpresas = Array.isArray(response?.data) ? response.data : [];
      });

    this.buscarSucursalCliente.valueChanges
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        tap(() => (this.resultadoSucursales = [])),
        filter((query) => !this.modoConsulta && this.mostrarSucursalCliente && String(query || '').trim().length > 0)
      )
      .subscribe((query) => {
        const q = String(query || '').trim().toUpperCase();
        this.resultadoSucursales = this.sucursalesCliente.filter((sucursal) =>
          `${sucursal.nom_sucursal || ''} ${sucursal.cod_sucursal || ''}`.toUpperCase().includes(q)
        );
      });
  }

  private configurarBusquedaProducto(): void {
    this.buscarCodigoMercancia.valueChanges
      .pipe(
        debounceTime(180),
        distinctUntilChanged(),
        tap(() => (this.resultadoProductos = [])),
        filter((query) => !this.modoConsulta && String(query || '').trim().length > 0),
        switchMap((query) => this.servicioProducto.buscarProductosPorCodigo(String(query || '').trim()))
      )
      .subscribe({
        next: (response) => {
          this.resultadoProductos = Array.isArray(response?.data) ? response.data : [];
        },
        error: (err) => this.mostrarError('Error consultando productos', err),
      });

    this.buscarDescripcionMercancia.valueChanges
      .pipe(
        debounceTime(180),
        distinctUntilChanged(),
        tap(() => (this.resultadoProductos = [])),
        filter((query) => !this.modoConsulta && String(query || '').trim().length > 0),
        switchMap((query) => this.servicioProducto.buscarProductosPorDescripcion(String(query || '').trim()))
      )
      .subscribe({
        next: (response) => {
          this.resultadoProductos = Array.isArray(response?.data) ? response.data : [];
        },
        error: (err) => this.mostrarError('Error consultando productos', err),
      });
  }

  private focusById(id: string): void {
    setTimeout(() => {
      const input = document.getElementById(id) as HTMLInputElement | null;
      input?.focus();
      input?.select?.();
    }, 80);
  }

  onControlUppercase(event: Event, control: FormControl): void {
    const input = event.target as HTMLInputElement;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const value = String(input.value || '').toUpperCase();
    input.value = value;
    control.setValue(value);
    if (start !== null && end !== null) {
      input.setSelectionRange(start, end);
    }
  }

  onFormUppercase(event: Event, controlName: string): void {
    const input = event.target as HTMLInputElement;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const value = String(input.value || '').toUpperCase();
    input.value = value;
    this.formulario.get(controlName)?.setValue(value);
    if (start !== null && end !== null) {
      input.setSelectionRange(start, end);
    }
  }

  private hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private getEmpresa(): string {
    try {
      const raw = localStorage.getItem('empresa');
      const parsed = raw ? JSON.parse(raw) : null;
      const emp = Array.isArray(parsed) ? parsed[0] : parsed;
      return String(emp?.cod_empre || localStorage.getItem('cod_empre') || localStorage.getItem('codigoempresa') || '').trim();
    } catch {
      return String(localStorage.getItem('cod_empre') || localStorage.getItem('codigoempresa') || '').trim();
    }
  }

  private getSucursal(): number | null {
    try {
      const raw = localStorage.getItem('sucursal');
      const parsed = raw ? JSON.parse(raw) : null;
      const suc = Array.isArray(parsed) ? parsed[0] : parsed;
      const id = Number(suc?.cod_sucursal || localStorage.getItem('idSucursal'));
      return Number.isFinite(id) && id > 0 ? id : null;
    } catch {
      const id = Number(localStorage.getItem('idSucursal'));
      return Number.isFinite(id) && id > 0 ? id : null;
    }
  }

  crearFormulario(): void {
    this.formulario = this.fb.group({
      so_codsoli: [''],
      so_fecha: [this.hoy(), Validators.required],
      so_codclie: ['', Validators.required],
      so_nomclie: ['', Validators.required],
      so_sucursal_clie: [''],
      so_nomvend: [localStorage.getItem('username') || ''],
      so_observacion: [''],
      so_status: ['A'],
      so_codempr: [this.getEmpresa()],
      so_codsucu: [this.getSucursal()],
    });
  }

  nuevoDetalle(): DetSolicitudPrestamoData {
    return {
      ds_codsoli: '',
      ds_codmerc: '',
      ds_desmerc: '',
      ds_canmerc: 1,
      ds_unidad: '',
    };
  }

  listar(page: number): void {
    this.currentPage = page;
    this.solicitudService.listar(page, this.pageSize, this.filtro).subscribe({
      next: (response) => {
        this.solicitudes = response?.data || [];
      },
      error: (err) => this.mostrarError('Error consultando solicitudes', err),
    });
  }

  nuevaSolicitud(): void {
    this.modoConsulta = false;
    this.tituloModal = 'Nueva Solicitud de Préstamo';
    this.crearFormulario();
    this.formulario.enable();
    this.detalle = [];
    this.detalleActual = this.nuevoDetalle();
    this.solicitudSeleccionada = null;
    this.limpiarBusquedaCliente();
    this.limpiarBusquedaProducto();
    $('#modalSolicitudPrestamo').modal('show');
    this.focusById('inputNombreClienteSolicitud');
  }

  private limpiarBusquedaCliente(): void {
    this.resultadoEmpresas = [];
    this.sucursalesCliente = [];
    this.resultadoSucursales = [];
    this.mostrarSucursalCliente = false;
    this.buscarEmpresaCliente.setValue('', { emitEvent: false });
    this.buscarSucursalCliente.setValue('', { emitEvent: false });
  }

  private limpiarBusquedaProducto(): void {
    this.resultadoProductos = [];
    this.buscarCodigoMercancia.setValue('', { emitEvent: false });
    this.buscarDescripcionMercancia.setValue('', { emitEvent: false });
  }

  cargarEmpresaCliente(empresa: EmpresaModelData): void {
    this.resultadoEmpresas = [];
    this.sucursalesCliente = [];
    this.resultadoSucursales = [];
    this.mostrarSucursalCliente = false;
    this.formulario.patchValue({
      so_codclie: empresa.cod_empre,
      so_nomclie: empresa.nom_empre,
      so_sucursal_clie: '',
    });
    this.buscarEmpresaCliente.setValue(empresa.nom_empre, { emitEvent: false });
    this.buscarSucursalCliente.setValue('', { emitEvent: false });

    this.servicioEmpresa.buscarEmpres(empresa.cod_empre).subscribe({
      next: (response) => {
        const data = Array.isArray(response?.data) ? response.data[0] : response?.data;
        this.sucursalesCliente = Array.isArray(data?.sucursales) ? data.sucursales : [];
        this.mostrarSucursalCliente = this.sucursalesCliente.length > 0;
        this.resultadoSucursales = this.sucursalesCliente;
        this.focusById(this.mostrarSucursalCliente ? 'inputSucursalCliente' : 'inputSolicitanteSolicitud');
      },
      error: (err) => this.mostrarError('Error consultando sucursales', err),
    });
  }

  seleccionarEmpresaEnter(event: Event): void {
    event.preventDefault();
    if (this.resultadoEmpresas.length > 0) {
      this.cargarEmpresaCliente(this.resultadoEmpresas[0]);
      return;
    }
    this.focusById(this.mostrarSucursalCliente ? 'inputSucursalCliente' : 'inputSolicitanteSolicitud');
  }

  cargarSucursalCliente(sucursal: SucursalesData): void {
    this.resultadoSucursales = [];
    this.formulario.patchValue({
      so_sucursal_clie: sucursal.nom_sucursal,
    });
    this.buscarSucursalCliente.setValue(sucursal.nom_sucursal, { emitEvent: false });
    this.focusById('inputObservacionSolicitud');
  }

  seleccionarSucursalEnter(event: Event): void {
    event.preventDefault();
    if (this.resultadoSucursales.length > 0) {
      this.cargarSucursalCliente(this.resultadoSucursales[0]);
      return;
    }
    this.focusById('inputObservacionSolicitud');
  }

  pasarAlCodigoMercancia(event: Event): void {
    event.preventDefault();
    if (!this.modoConsulta) {
      this.focusById('inputCodigoMercanciaSolicitud');
    }
  }

  onCodigoMercanciaInput(event: Event): void {
    const value = String((event.target as HTMLInputElement)?.value || '').toUpperCase();
    this.detalleActual.ds_codmerc = value;
    this.buscarCodigoMercancia.setValue(value);
  }

  onDescripcionMercanciaInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const value = String(input.value || '').toUpperCase();
    input.value = value;
    this.detalleActual.ds_desmerc = value;
    this.buscarDescripcionMercancia.setValue(value);
    if (start !== null && end !== null) {
      input.setSelectionRange(start, end);
    }
  }

  onDetalleUppercase(event: Event, field: 'ds_desmerc' | 'ds_unidad'): void {
    const input = event.target as HTMLInputElement;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const value = String(input.value || '').toUpperCase();
    input.value = value;
    this.detalleActual[field] = value;
    if (start !== null && end !== null) {
      input.setSelectionRange(start, end);
    }
  }

  cargarProducto(producto: any): void {
    this.resultadoProductos = [];
    const codigo = String(producto?.in_codmerc ?? producto?.codigo ?? '').trim();
    const descripcion = String(producto?.in_desmerc ?? producto?.descripcion ?? '').trim();
    const unidad = String(producto?.in_unidad ?? producto?.unidad ?? producto?.in_medida ?? '').trim();
    this.detalleActual = {
      ...this.detalleActual,
      ds_codmerc: codigo,
      ds_desmerc: descripcion,
      ds_unidad: unidad,
      ds_canmerc: Math.max(1, Number(this.detalleActual.ds_canmerc || 1)),
    };
    this.buscarCodigoMercancia.setValue(codigo, { emitEvent: false });
    this.buscarDescripcionMercancia.setValue(descripcion, { emitEvent: false });
    this.focusById('inputCantidadSolicitud');
  }

  seleccionarProductoEnter(event: Event): void {
    event.preventDefault();
    if (!String(this.detalleActual.ds_codmerc || '').trim()) {
      this.focusById('inputDescripcionSolicitud');
      return;
    }
    if (this.resultadoProductos.length > 0) {
      this.cargarProducto(this.resultadoProductos[0]);
      return;
    }
    this.focusById('inputDescripcionSolicitud');
  }

  seleccionarProductoDescripcionEnter(event: Event): void {
    event.preventDefault();
    if (this.resultadoProductos.length > 0) {
      this.cargarProducto(this.resultadoProductos[0]);
      return;
    }
    this.focusById('inputCantidadSolicitud');
  }

  agregarDetalleEnter(event: Event): void {
    event.preventDefault();
    this.agregarDetalle();
  }

  agregarDetalle(): void {
    const item = {
      ...this.detalleActual,
      ds_codmerc: String(this.detalleActual.ds_codmerc || '').trim().toUpperCase(),
      ds_desmerc: String(this.detalleActual.ds_desmerc || '').trim().toUpperCase(),
      ds_unidad: String(this.detalleActual.ds_unidad || '').trim().toUpperCase(),
      ds_canmerc: Number(this.detalleActual.ds_canmerc || 0),
    };

    if (!item.ds_codmerc || !item.ds_desmerc || item.ds_canmerc < 1) {
      Swal.fire({
        title: 'Detalle incompleto',
        text: 'Complete código, descripción y cantidad.',
        icon: 'warning',
        confirmButtonText: 'Aceptar',
      });
      return;
    }

    this.detalle.push(item);
    this.detalleActual = this.nuevoDetalle();
    this.limpiarBusquedaProducto();
    this.focusById('inputCodigoMercanciaSolicitud');
  }

  quitarDetalle(index: number): void {
    this.detalle.splice(index, 1);
  }

  guardarSolicitud(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      Swal.fire({
        title: 'Datos incompletos',
        text: 'Complete código y nombre del cliente.',
        icon: 'warning',
        confirmButtonText: 'Aceptar',
      });
      return;
    }

    if (this.mostrarSucursalCliente && !this.formulario.getRawValue()?.so_sucursal_clie) {
      Swal.fire({
        title: 'Sucursal requerida',
        text: 'Seleccione la sucursal de la empresa.',
        icon: 'warning',
        confirmButtonText: 'Aceptar',
      });
      return;
    }

    if (!this.detalle.length) {
      Swal.fire({
        title: 'Sin productos',
        text: 'Agregue al menos un producto a la solicitud.',
        icon: 'warning',
        confirmButtonText: 'Aceptar',
      });
      return;
    }

    this.solicitudService.guardar(this.formulario.getRawValue(), this.detalle).subscribe({
      next: () => {
        Swal.fire({
          title: 'Excelente!',
          text: 'Solicitud guardada correctamente.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
        });
        $('#modalSolicitudPrestamo').modal('hide');
        this.listar(1);
      },
      error: (err) => this.mostrarError('Error guardando la solicitud', err),
    });
  }

  consultarSolicitud(numero: string): void {
    this.solicitudService.buscar(numero).subscribe({
      next: (response) => {
        const data = response?.data;
        if (!data) return;
        this.modoConsulta = true;
        this.tituloModal = 'Consulta Solicitud de Préstamo';
        this.solicitudSeleccionada = data;
        this.detalle = data.detsolicitud || [];
        this.formulario.patchValue(data);
        this.buscarEmpresaCliente.setValue(data.so_nomclie || '', { emitEvent: false });
        this.buscarSucursalCliente.setValue(data.so_sucursal_clie || '', { emitEvent: false });
        this.mostrarSucursalCliente = !!data.so_sucursal_clie;
        this.formulario.disable();
        $('#modalSolicitudPrestamo').modal('show');
      },
      error: (err) => this.mostrarError('Error consultando la solicitud', err),
    });
  }

  imprimirSolicitud(numero: string): void {
    this.solicitudService.buscar(numero).subscribe({
      next: (response) => {
        this.solicitudSeleccionada = response?.data || null;
        this.imprimirSolicitudActual();
      },
      error: (err) => this.mostrarError('Error imprimiendo la solicitud', err),
    });
  }

  imprimirSeleccionada(): void {
    const raw = this.formulario.getRawValue();
    this.solicitudSeleccionada = {
      ...raw,
      detsolicitud: this.detalle,
    };
    this.imprimirSolicitudActual();
  }

  private imprimirSolicitudActual(): void {
    if (!this.solicitudSeleccionada) return;
    const html = this.buildSolicitudPrintHtml(this.solicitudSeleccionada);
    this.printingService.printHtmlContent(html, 'reporte');
  }

  private buildSolicitudPrintHtml(data: SolicitudPrestamoData): string {
    const formatDate = (value: any) => {
      if (!value) return '';
      const dt = new Date(value);
      if (Number.isNaN(dt.getTime())) return String(value);
      return new Intl.DateTimeFormat('es-DO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(dt);
    };

    const escapeHtml = (value: any) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const rows = (data.detsolicitud || [])
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.ds_codmerc)}</td>
            <td>${escapeHtml(item.ds_desmerc)}</td>
            <td>${escapeHtml(item.ds_unidad)}</td>
            <td style="text-align:right;">${escapeHtml(Number(item.ds_canmerc || 0).toFixed(2))}</td>
          </tr>
        `
      )
      .join('');

    return `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Solicitud de Prestamo</title>
          <style>
            body { font-family: Arial, sans-serif; color: #1f2937; padding: 28px; }
            h1 { margin: 0 0 6px; font-size: 22px; text-align: center; }
            .meta { margin: 0 0 18px; text-align: center; color: #4b5563; font-size: 13px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 18px; margin-bottom: 18px; }
            .row-full { grid-column: 1 / -1; }
            .label { font-size: 12px; color: #6b7280; margin-bottom: 2px; }
            .value { font-size: 14px; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #d1d5db; padding: 8px 10px; font-size: 13px; }
            th { background: #eef2f7; text-align: left; }
            .footer { margin-top: 24px; font-size: 12px; color: #6b7280; text-align: center; }
          </style>
        </head>
        <body>
          <h1>Solicitud de Prestamo</h1>
          <p class="meta">Saltor System</p>
          <div class="grid">
            <div>
              <div class="label">Numero</div>
              <div class="value">${escapeHtml(data.so_codsoli)}</div>
            </div>
            <div>
              <div class="label">Fecha</div>
              <div class="value">${escapeHtml(formatDate(data.so_fecha))}</div>
            </div>
            <div>
              <div class="label">Cliente</div>
              <div class="value">${escapeHtml(data.so_codclie)} - ${escapeHtml(data.so_nomclie)}</div>
            </div>
            <div>
              <div class="label">Solicitante</div>
              <div class="value">${escapeHtml(data.so_nomvend)}</div>
            </div>
            <div class="row-full">
              <div class="label">Sucursal Cliente</div>
              <div class="value">${escapeHtml(data.so_sucursal_clie)}</div>
            </div>
            <div class="row-full">
              <div class="label">Observacion</div>
              <div class="value">${escapeHtml(data.so_observacion)}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Descripcion</th>
                <th>Unidad</th>
                <th style="text-align:right;">Cantidad</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="footer">Documento generado para impresion desde la app desktop.</div>
        </body>
      </html>
    `;
  }

  private mostrarError(titulo: string, err: any): void {
    Swal.fire({
      title: titulo,
      text: err?.message || err?.error?.message || 'Ocurrió un error en Supabase.',
      icon: 'error',
      confirmButtonText: 'Aceptar',
    });
  }
}
