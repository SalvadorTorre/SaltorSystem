import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ServicioContFactura } from 'src/app/core/services/mantenimientos/contfactura/contfactura.service';
import { ServicioSucursal } from 'src/app/core/services/mantenimientos/sucursal/sucursal.service';
import Swal from 'sweetalert2';

interface ContFacturaField {
  key: string;
  label: string;
  required?: boolean;
}

@Component({
  selector: 'app-config-contfactura',
  templateUrl: './contfactura.html',
  styleUrls: ['./contfactura.css']
})
export class ContFacturaPage implements OnInit {
  items: any[] = [];
  sucursales: any[] = [];

  filtroSucursal: string | number | undefined;
  actual: any = this.crearActual();
  detalleSeleccionado: any | null = null;
  editId: number | null = null;

  pageSize = 10;
  currentPage = 1;
  totalItems = 0;
  cargando = false;
  guardando = false;

  camposContadores: ContFacturaField[] = [
    { key: 'contfact', label: 'Contador factura', required: true },
    { key: 'contador', label: 'Contador general' },
    { key: 'contsalida', label: 'Cont. salida' },
    { key: 'contentrada', label: 'Cont. entrada' },
    { key: 'contvinterna', label: 'Cont. venta interna' },
    { key: 'contcotizacion', label: 'Cont. cotizacion' },
    { key: 'contnotacredito', label: 'Cont. nota credito' },
  ];

  constructor(
    private contSrv: ServicioContFactura,
    private sucSrv: ServicioSucursal,
  ) {}

  ngOnInit(): void {
    this.cargarSucursales();
    this.cargarItems();
  }

  private crearActual(base?: any): any {
    const sucursalActiva = Number(localStorage.getItem('idSucursal') || 0) || undefined;
    return {
      idsucursal: base?.idsucursal ?? base?.cod_sucursal ?? sucursalActiva,
      ano: base?.ano ?? new Date().getFullYear(),
      contador: base?.contador ?? 0,
      contsalida: base?.contsalida ?? 0,
      contentrada: base?.contentrada ?? 0,
      contvinterna: base?.contvinterna ?? 0,
      contfact: base?.contfact ?? 0,
      contcotizacion: base?.contcotizacion ?? 0,
      contnotacredito: base?.contnotacredito ?? 0,
    };
  }

  private unwrapList(res: any): any[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.data?.items)) return res.data.items;
    return [];
  }

  private extraerTotal(res: any): number {
    return Number(res?.pagination?.total ?? res?.total ?? res?.data?.total ?? this.items.length ?? 0);
  }

  private extraerError(err: any): string {
    return String(err?.error?.message || err?.message || err?.messageText || 'No se pudo completar la operacion.');
  }

  cargarSucursales(): void {
    this.sucSrv.buscarTodasSucursal().subscribe({
      next: (res: any) => {
        this.sucursales = this.unwrapList(res);
      },
      error: () => {
        this.sucursales = [];
      }
    });
  }

  cargarItems(page: number = this.currentPage): void {
    this.currentPage = page;
    this.cargando = true;
    this.contSrv.buscarTodos(this.currentPage, this.pageSize, this.filtroSucursal).subscribe({
      next: (res: any) => {
        this.items = this.unwrapList(res);
        this.totalItems = this.extraerTotal(res);
        this.cargando = false;
      },
      error: (err) => {
        this.items = [];
        this.totalItems = 0;
        this.cargando = false;
        Swal.fire('Error', this.extraerError(err), 'error');
      }
    });
  }

  nombreSucursal(cod?: number | string): string {
    const c = Number(cod);
    const s = this.sucursales.find((x: any) => Number(x?.cod_sucursal) === c);
    return s?.nom_sucursal || '-';
  }

  descSucursal(it: any): string {
    return it?.sucursal?.nom_sucursal || this.nombreSucursal(it?.idsucursal ?? it?.cod_sucursal ?? it?.sucursal);
  }

  abrirNuevo(): void {
    this.editId = null;
    this.actual = this.crearActual();
    this.detalleSeleccionado = null;
  }

  abrirEditar(it: any): void {
    const id = Number(it?.id || it?.cod || 0);
    this.editId = id || null;
    this.detalleSeleccionado = it;
    this.actual = this.crearActual(it);

    if (!id) return;

    this.contSrv.buscarPorId(id).subscribe({
      next: (res: any) => {
        const r = Array.isArray(res?.data) ? res.data[0] : (res?.data || res);
        this.detalleSeleccionado = r || it;
        this.actual = this.crearActual(r || it);
      },
      error: () => {
        this.detalleSeleccionado = it;
        this.actual = this.crearActual(it);
      }
    });
  }

  payloadActual(): any {
    return {
      idsucursal: Number(this.actual.idsucursal),
      ano: Number(this.actual.ano),
      contador: Number(this.actual.contador || 0),
      contsalida: Number(this.actual.contsalida || 0),
      contentrada: Number(this.actual.contentrada || 0),
      contvinterna: Number(this.actual.contvinterna || 0),
      contfact: Number(this.actual.contfact || 0),
      contcotizacion: Number(this.actual.contcotizacion || 0),
      contnotacredito: Number(this.actual.contnotacredito || 0),
    };
  }

  guardar(form: NgForm): void {
    if (!form.valid || this.guardando) return;
    if (!Number(this.actual.idsucursal || 0)) {
      Swal.fire('Sucursal requerida', 'Seleccione la sucursal del control.', 'warning');
      return;
    }

    this.guardando = true;
    const request$ = this.editId
      ? this.contSrv.editarContFactura(this.editId, this.payloadActual())
      : this.contSrv.guardarContFactura(this.payloadActual());

    request$.subscribe({
      next: () => {
        this.guardando = false;
        Swal.fire('Guardado', 'El control de factura fue guardado correctamente.', 'success');
        this.cargarItems();
      },
      error: (err) => {
        this.guardando = false;
        Swal.fire('Error', this.extraerError(err), 'error');
      }
    });
  }

  eliminar(it: any): void {
    const id = Number(it?.id || it?.cod || 0);
    if (!id) return;

    Swal.fire({
      title: 'Eliminar control',
      text: 'Esta accion eliminara el registro seleccionado.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.contSrv.eliminarContFactura(id).subscribe({
        next: () => {
          Swal.fire('Eliminado', 'El control fue eliminado correctamente.', 'success');
          this.cargarItems();
        },
        error: (err) => Swal.fire('Error', this.extraerError(err), 'error')
      });
    });
  }
}
