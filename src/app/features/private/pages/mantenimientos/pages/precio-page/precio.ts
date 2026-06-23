import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { ModeloInventarioData } from 'src/app/core/services/mantenimientos/inventario';
import { ServicioInventario } from 'src/app/core/services/mantenimientos/inventario/inventario.service';
import { SucursalesData } from 'src/app/core/services/mantenimientos/sucursal';
import { ServicioSucursal } from 'src/app/core/services/mantenimientos/sucursal/sucursal.service';

interface ProductoPrecioSeleccionado {
  codigo: string;
  descripcion: string;
  costo: number | null;
  precioActual: number;
  nuevoPrecio: number | null;
}

@Component({
  selector: 'app-precio-page',
  templateUrl: './precio.html',
  styleUrls: ['./precio.css'],
})
export class PrecioPageComponent implements OnInit {
  codigoInput = '';
  descripcionInput = '';
  productosList: ModeloInventarioData[] = [];
  productosSeleccionados: ProductoPrecioSeleccionado[] = [];
  sucursalesList: SucursalesData[] = [];
  sucursalesSeleccionadas: Record<number, boolean> = {};
  buscandoProductos = false;
  cargandoSucursales = false;
  guardando = false;

  constructor(
    private readonly servicioInventario: ServicioInventario,
    private readonly servicioSucursal: ServicioSucursal,
  ) {}

  ngOnInit(): void {
    this.buscarProductos();
    this.obtenerSucursales();
  }

  buscarProductos(): void {
    this.buscandoProductos = true;
    this.servicioInventario
      .obtenerTodosInventario(1, 100, this.codigoInput, this.descripcionInput)
      .subscribe({
        next: (response) => {
          this.productosList = response?.data || [];
          this.buscandoProductos = false;
        },
        error: () => {
          this.productosList = [];
          this.buscandoProductos = false;
          Swal.fire('Error', 'No se pudieron buscar los productos.', 'error');
        },
      });
  }

  obtenerSucursales(): void {
    this.cargandoSucursales = true;
    this.servicioSucursal.buscarTodasSucursal().subscribe({
      next: (response) => {
        this.sucursalesList = response?.data || [];
        this.cargandoSucursales = false;
      },
      error: () => {
        this.sucursalesList = [];
        this.cargandoSucursales = false;
        Swal.fire('Error', 'No se pudieron cargar las sucursales.', 'error');
      },
    });
  }

  onCodigoInput(event: Event): void {
    this.codigoInput = ((event.target as HTMLInputElement)?.value || '').toUpperCase();
  }

  onDescripcionInput(event: Event): void {
    this.descripcionInput = ((event.target as HTMLInputElement)?.value || '').toUpperCase();
  }

  productoSeleccionado(producto: ModeloInventarioData): boolean {
    const codigo = String((producto as any)?.in_codmerc || '').trim();
    return this.productosSeleccionados.some((item) => item.codigo === codigo);
  }

  toggleProducto(producto: ModeloInventarioData, event: Event): void {
    const checked = !!((event.target as HTMLInputElement)?.checked);
    const codigo = String((producto as any)?.in_codmerc || '').trim();
    if (!codigo) return;

    if (!checked) {
      this.quitarProducto(codigo);
      return;
    }

    if (this.productoSeleccionado(producto)) return;

    const precioActual = Number((producto as any)?.in_premerc || 0);
    const costoRaw = (producto as any)?.in_cosmerc;
    const costo = costoRaw === null || costoRaw === undefined || costoRaw === ''
      ? null
      : Number(costoRaw);

    this.productosSeleccionados.push({
      codigo,
      descripcion: String((producto as any)?.in_desmerc || ''),
      costo: costo === null ? null : (Number.isFinite(costo) ? costo : null),
      precioActual: Number.isFinite(precioActual) ? precioActual : 0,
      nuevoPrecio: Number.isFinite(precioActual) && precioActual > 0 ? precioActual : null,
    });
  }

  quitarProducto(codigo: string): void {
    this.productosSeleccionados = this.productosSeleccionados
      .filter((item) => item.codigo !== codigo);
  }

  toggleSucursal(sucursal: SucursalesData, event: Event): void {
    const checked = !!((event.target as HTMLInputElement)?.checked);
    const codigoSucursal = Number((sucursal as any)?.cod_sucursal || 0);
    if (!codigoSucursal) return;
    this.sucursalesSeleccionadas[codigoSucursal] = checked;
  }

  sucursalSeleccionada(sucursal: SucursalesData): boolean {
    const codigoSucursal = Number((sucursal as any)?.cod_sucursal || 0);
    return !!this.sucursalesSeleccionadas[codigoSucursal];
  }

  seleccionarTodasSucursales(checked: boolean): void {
    this.sucursalesList.forEach((sucursal) => {
      const codigoSucursal = Number((sucursal as any)?.cod_sucursal || 0);
      if (codigoSucursal) {
        this.sucursalesSeleccionadas[codigoSucursal] = checked;
      }
    });
  }

  get sucursalesSeleccionadasIds(): number[] {
    return Object.keys(this.sucursalesSeleccionadas)
      .filter((key) => !!this.sucursalesSeleccionadas[Number(key)])
      .map((key) => Number(key));
  }

  get puedeGuardar(): boolean {
    return !this.guardando
      && this.productosSeleccionados.length > 0
      && this.sucursalesSeleccionadasIds.length > 0
      && this.productosSeleccionados.every((item) => {
        const precio = Number(item.nuevoPrecio);
        return Number.isFinite(precio) && precio > 0;
      });
  }

  limpiarSeleccion(): void {
    this.productosSeleccionados = [];
    this.sucursalesSeleccionadas = {};
  }

  guardar(): void {
    if (!this.productosSeleccionados.length) {
      Swal.fire('Productos requeridos', 'Debe seleccionar al menos un producto.', 'warning');
      return;
    }

    const sucursales = this.sucursalesSeleccionadasIds;
    if (!sucursales.length) {
      Swal.fire('Sucursales requeridas', 'Debe seleccionar al menos una sucursal.', 'warning');
      return;
    }

    const productoInvalido = this.productosSeleccionados.find((item) => {
      const precio = Number(item.nuevoPrecio);
      return !Number.isFinite(precio) || precio <= 0;
    });
    if (productoInvalido) {
      Swal.fire('Precio invalido', `Revise el precio del producto ${productoInvalido.codigo}.`, 'warning');
      return;
    }

    this.guardando = true;
    this.servicioInventario.actualizarPreciosPorSucursales({
      productos: this.productosSeleccionados.map((item) => ({
        codigo: item.codigo,
        descripcion: item.descripcion,
        costo: item.costo,
        precio: Number(item.nuevoPrecio),
      })),
      sucursales,
    }).subscribe({
      next: (response) => {
        this.guardando = false;
        const data = response?.data || {};
        Swal.fire({
          title: 'Precios actualizados',
          text: `Actualizados: ${Number(data.actualizados || 0)}. Creados: ${Number(data.insertados || 0)}.`,
          icon: 'success',
          timer: 2500,
          showConfirmButton: false,
        });
      },
      error: (err) => {
        this.guardando = false;
        const msg = String(err?.message || err?.error?.message || 'No se pudieron actualizar los precios');
        Swal.fire('Error', msg, 'error');
      },
    });
  }
}
