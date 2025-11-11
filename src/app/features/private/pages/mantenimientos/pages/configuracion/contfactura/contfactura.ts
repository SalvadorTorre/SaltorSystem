import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ServicioContFactura } from 'src/app/core/services/mantenimientos/contfactura/contfactura.service';
import { ServicioSucursal } from 'src/app/core/services/mantenimientos/sucursal/sucursal.service';

@Component({
  selector: 'app-config-contfactura',
  templateUrl: './contfactura.html',
  styleUrls: ['./contfactura.css']
})
export class ContFacturaPage implements OnInit {
  items: any[] = [];
  sucursales: any[] = [];

  filtroSucursal: string | number | undefined;

  editIndex = -1;
  actual: any = { idsucursal: undefined, ano: new Date().getFullYear(), contador: 0 };
  detalleSeleccionado: any | null = null;

  pageSize = 10;
  currentPage = 1;

  constructor(
    private contSrv: ServicioContFactura,
    private sucSrv: ServicioSucursal,
  ) {}

  ngOnInit(): void {
    this.cargarSucursales();
    this.cargarItems();
  }

  private unwrapList(res: any): any[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.data?.items)) return res.data.items;
    return [];
  }

  cargarSucursales(): void {
    this.sucSrv.buscarTodasSucursal().subscribe({
      next: (res) => {
        this.sucursales = this.unwrapList(res);
      },
      error: () => {
        this.sucursales = [];
      }
    });
  }

  cargarItems(page: number = this.currentPage): void {
    this.currentPage = page;
    this.contSrv.buscarTodos(this.currentPage, this.pageSize, this.filtroSucursal).subscribe({
      next: (res) => {
        this.items = this.unwrapList(res);
      },
      error: () => {
        this.items = [];
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
    this.editIndex = -1;
    this.actual = { idsucursal: undefined, ano: new Date().getFullYear(), contador: 0 };
    this.detalleSeleccionado = null;
  }

  abrirEditar(it: any, idx: number): void {
    this.editIndex = idx;
    const id = Number(it?.id || it?.cod || 0);
    if (id) {
      this.contSrv.buscarPorId(id).subscribe({
        next: (res) => {
          const r = Array.isArray(res?.data) ? res.data[0] : (res?.data || res);
          this.detalleSeleccionado = r || it;
          this.actual = {
            idsucursal: r?.idsucursal ?? r?.sucursal?.cod_sucursal ?? it?.idsucursal ?? it?.cod_sucursal ?? undefined,
            ano: r?.ano ?? it?.ano ?? new Date().getFullYear(),
            contador: r?.contador ?? it?.contador ?? 0,
          };
        },
        error: () => {
          this.detalleSeleccionado = it;
          this.actual = {
            idsucursal: it?.idsucursal ?? it?.cod_sucursal ?? undefined,
            ano: it?.ano ?? new Date().getFullYear(),
            contador: it?.contador ?? 0,
          };
        }
      });
    } else {
      this.detalleSeleccionado = it;
      this.actual = {
        idsucursal: it?.idsucursal ?? it?.cod_sucursal ?? undefined,
        ano: it?.ano ?? new Date().getFullYear(),
        contador: it?.contador ?? 0,
      };
    }
  }

  guardar(form: NgForm): void {
    if (!form.valid) return;
    const payload = {
      idsucursal: Number(this.actual.idsucursal),
      ano: Number(this.actual.ano),
      contador: Number(this.actual.contador),
    };
    if (this.editIndex >= 0) {
      const edit = this.items[this.editIndex];
      const id = Number(edit?.id || edit?.cod || 0);
      if (!id) return;
      this.contSrv.editarContFactura(id, payload).subscribe({
        next: () => {
          this.cargarItems();
        },
        error: () => {}
      });
    } else {
      this.contSrv.guardarContFactura(payload).subscribe({
        next: () => {
          this.cargarItems();
        },
        error: () => {}
      });
    }
    this.editIndex = -1;
    this.actual = { idsucursal: undefined, ano: new Date().getFullYear(), contador: 0 };
    form.resetForm({ idsucursal: undefined, ano: new Date().getFullYear(), contador: 0 });
  }

  eliminar(it: any): void {
    const id = Number(it?.id || it?.cod || 0);
    if (!id) return;
    this.contSrv.eliminarContFactura(id).subscribe({
      next: () => {
        this.cargarItems();
      },
      error: () => {}
    });
  }
}