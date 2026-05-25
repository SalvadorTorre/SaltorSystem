import { Component, OnInit } from '@angular/core';
import { ServicioInventario } from 'src/app/core/services/mantenimientos/inventario/inventario.service';
import { ServicioSucursal } from 'src/app/core/services/mantenimientos/sucursal/sucursal.service';
import { SucursalesData } from 'src/app/core/services/mantenimientos/sucursal';
import Swal from 'sweetalert2';

interface InventarioSucursalRow {
  id: number | null;
  inv_codsucu: number;
  inv_codprod: string;
  inv_desprod: string | null;
  inv_cosprod: number | null;
  inv_preprod: number | null;
  inv_existencia: number;
  activo?: boolean | null;
  inv_fechamov?: string | null;
}

@Component({
  selector: 'app-inventario-sucursal-page',
  templateUrl: './inventario-sucursal.html',
  styleUrls: ['./inventario-sucursal.css'],
})
export class InventarioSucursalPageComponent implements OnInit {
  loading = false;
  sucursales: SucursalesData[] = [];
  selectedSucursal = 0;
  inventarioList: InventarioSucursalRow[] = [];
  guardandoPorFila: Record<string, boolean> = {};
  codigo = '';
  descripcion = '';

  totalItems = 0;
  pageSize = 15;
  currentPage = 1;
  maxPagesToShow = 5;

  constructor(
    private servicioSucursal: ServicioSucursal,
    private servicioInventario: ServicioInventario
  ) {}

  ngOnInit(): void {
    this.cargarSucursales();
  }

  cargarSucursales(): void {
    this.loading = true;
    this.servicioSucursal.buscarTodasSucursal().subscribe({
      next: (response: any) => {
        this.sucursales = Array.isArray(response?.data) ? response.data : [];
        this.selectedSucursal = Number(this.sucursales[0]?.cod_sucursal || 0);
        this.currentPage = 1;
        this.cargarInventarioSucursal();
      },
      error: (error) => {
        this.loading = false;
        console.error(error);
        this.sucursales = [];
        this.selectedSucursal = 0;
        this.inventarioList = [];
        Swal.fire('Error', 'No se pudo cargar el listado de sucursales.', 'error');
      },
    });
  }

  cargarInventarioSucursal(page = this.currentPage): void {
    this.currentPage = Math.max(Number(page || 1), 1);

    if (!this.selectedSucursal) {
      this.loading = false;
      this.inventarioList = [];
      this.totalItems = 0;
      return;
    }

    this.loading = true;
    this.servicioInventario
      .obtenerInventarioPorSucursal(
        this.selectedSucursal,
        this.currentPage,
        this.pageSize,
        this.codigo,
        this.descripcion
      )
      .subscribe({
        next: (response: any) => {
          const rows = Array.isArray(response?.data) ? response.data : [];
          this.inventarioList = rows.map((item: any) => ({
            ...item,
            inv_existencia: Number(item?.inv_existencia ?? 0),
            inv_cosprod:
              item?.inv_cosprod === null || item?.inv_cosprod === undefined || item?.inv_cosprod === ''
                ? null
                : Number(item.inv_cosprod),
            inv_preprod:
              item?.inv_preprod === null || item?.inv_preprod === undefined || item?.inv_preprod === ''
                ? null
                : Number(item.inv_preprod),
            activo: item?.activo === false ? false : true,
          }));
          this.totalItems = Number(response?.pagination?.total || this.inventarioList.length);
          this.currentPage = Number(response?.pagination?.page || this.currentPage);
          this.loading = false;
        },
        error: (error) => {
          this.loading = false;
          console.error(error);
          Swal.fire('Error', 'No se pudo cargar el inventario de la sucursal.', 'error');
        },
      });
  }

  onSucursalChange(): void {
    this.currentPage = 1;
    this.cargarInventarioSucursal(1);
  }

  buscar(): void {
    this.currentPage = 1;
    this.cargarInventarioSucursal(1);
  }

  limpiarFiltros(): void {
    this.codigo = '';
    this.descripcion = '';
    this.currentPage = 1;
    this.cargarInventarioSucursal(1);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }
    this.cargarInventarioSucursal(page);
  }

  get totalPages(): number {
    return Math.max(Math.ceil(this.totalItems / this.pageSize), 1);
  }

  get pages(): number[] {
    const totalPages = this.totalPages;
    const half = Math.floor(this.maxPagesToShow / 2);
    let startPage = Math.max(this.currentPage - half, 1);
    let endPage = Math.min(startPage + this.maxPagesToShow - 1, totalPages);

    if (endPage - startPage + 1 < this.maxPagesToShow) {
      startPage = Math.max(endPage - this.maxPagesToShow + 1, 1);
    }

    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }

  get sucursalActual(): SucursalesData | undefined {
    return this.sucursales.find(
      (item) => Number(item.cod_sucursal) === Number(this.selectedSucursal)
    );
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  guardarFila(item: InventarioSucursalRow): void {
    const key = this.rowKey(item);
    this.guardandoPorFila[key] = true;

    this.servicioInventario
      .guardarInventarioSucursal({
        inv_codsucu: Number(item.inv_codsucu),
        inv_codprod: String(item.inv_codprod || '').trim(),
        inv_desprod: item.inv_desprod ?? null,
        inv_existencia: Number(item.inv_existencia ?? 0),
        inv_cosprod: this.toNullableNumber(item.inv_cosprod),
        inv_preprod: this.toNullableNumber(item.inv_preprod),
        activo: item.activo !== false,
      })
      .subscribe({
        next: (response: any) => {
          const data = response?.data || {};
          item.id = data?.id ?? item.id ?? null;
          item.inv_existencia = Number(data?.inv_existencia ?? item.inv_existencia ?? 0);
          item.inv_cosprod = this.toNullableNumber(data?.inv_cosprod);
          item.inv_preprod = this.toNullableNumber(data?.inv_preprod);
          item.activo = data?.activo === false ? false : true;
          this.guardandoPorFila[key] = false;
          Swal.fire({
            title: 'Inventario actualizado',
            text: `${item.inv_codprod} guardado para ${this.sucursalActual?.nom_sucursal || 'la sucursal'}.`,
            icon: 'success',
            timer: 1400,
            showConfirmButton: false,
          });
        },
        error: (error) => {
          this.guardandoPorFila[key] = false;
          console.error(error);
          Swal.fire('Error', error?.message || 'No se pudo guardar la fila.', 'error');
        },
      });
  }

  rowKey(item: InventarioSucursalRow): string {
    return `${item.inv_codsucu}-${item.inv_codprod}`;
  }
}
