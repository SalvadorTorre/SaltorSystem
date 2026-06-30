import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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
  @ViewChild('codigoInputRef') codigoInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('descripcionInputRef') descripcionInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('precioNuevoInputRef') precioNuevoInputRef?: ElementRef<HTMLInputElement>;

  codigoInput = '';
  descripcionInput = '';
  precioActualInput: number | null = null;
  precioNuevoInput: number | null = null;
  productoPendiente: ModeloInventarioData | null = null;
  editandoCodigo: string | null = null;
  codigoSugerencias: ModeloInventarioData[] = [];
  descripcionSugerencias: ModeloInventarioData[] = [];
  mostrarSugerenciasCodigo = false;
  mostrarSugerenciasDescripcion = false;
  sugerenciaCodigoActiva = 0;
  sugerenciaDescripcionActiva = 0;
  productosSeleccionados: ProductoPrecioSeleccionado[] = [];
  sucursalesList: SucursalesData[] = [];
  sucursalesSeleccionadas: Record<number, boolean> = {};
  buscandoProductos = false;
  cargandoSucursales = false;
  guardando = false;
  estadoSupabase = 'Conectando con Supabase...';
  ultimoResultado = '';
  private readonly sugerenciasCodigoLimite = 50;
  private codigoSearchTimer: any = null;
  private descripcionSearchTimer: any = null;

  constructor(
    private readonly servicioInventario: ServicioInventario,
    private readonly servicioSucursal: ServicioSucursal,
  ) {}

  ngOnInit(): void {
    this.obtenerSucursales();
  }

  obtenerSucursales(): void {
    this.cargandoSucursales = true;
    this.servicioSucursal.buscarTodasSucursal().subscribe({
      next: (response) => {
        this.sucursalesList = response?.data || [];
        this.cargandoSucursales = false;
        this.estadoSupabase = 'Conectado a Supabase';
      },
      error: (err) => {
        this.sucursalesList = [];
        this.cargandoSucursales = false;
        this.estadoSupabase = 'Error de conexion con Supabase';
        const msg = String(err?.message || err?.error?.message || 'No se pudieron cargar las sucursales.');
        console.error('Supabase sucursales:', msg);
        Swal.fire('Error', 'No se pudieron cargar las sucursales.', 'error');
      },
    });
  }

  onCodigoInput(event: Event): void {
    this.codigoInput = ((event.target as HTMLInputElement)?.value || '').toUpperCase();
    this.mostrarSugerenciasCodigo = !!this.codigoInput.trim();
    this.sugerenciaCodigoActiva = 0;

    if (this.codigoSearchTimer) {
      clearTimeout(this.codigoSearchTimer);
    }

    this.codigoSearchTimer = setTimeout(() => {
      this.buscarSugerenciasCodigo();
    }, 250);
  }

  onDescripcionInput(event: Event): void {
    this.descripcionInput = ((event.target as HTMLInputElement)?.value || '').toUpperCase();
    this.mostrarSugerenciasDescripcion = !!this.descripcionInput.trim();
    this.sugerenciaDescripcionActiva = 0;

    if (this.descripcionSearchTimer) {
      clearTimeout(this.descripcionSearchTimer);
    }

    this.descripcionSearchTimer = setTimeout(() => {
      this.buscarSugerenciasDescripcion();
    }, 250);
  }

  onPrecioNuevoInput(): void {
    return;
  }

  productoSeleccionado(producto: ModeloInventarioData): boolean {
    const codigo = String((producto as any)?.in_codmerc || '').trim();
    return this.productosSeleccionados.some((item) => item.codigo === codigo);
  }

  private normalizarTexto(value: any): string {
    return String(value || '').trim().toUpperCase();
  }

  private ordenarProductosPorCodigo(rows: ModeloInventarioData[], codigo: string): ModeloInventarioData[] {
    const buscado = this.normalizarTexto(codigo);
    return [...(rows || [])].sort((a, b) => {
      const codA = this.normalizarTexto((a as any)?.in_codmerc);
      const codB = this.normalizarTexto((b as any)?.in_codmerc);
      const exactA = codA === buscado ? 0 : 1;
      const exactB = codB === buscado ? 0 : 1;
      if (exactA !== exactB) return exactA - exactB;
      const startA = codA.startsWith(buscado) ? 0 : 1;
      const startB = codB.startsWith(buscado) ? 0 : 1;
      if (startA !== startB) return startA - startB;
      return codA.length - codB.length;
    });
  }

  buscarSugerenciasCodigo(): void {
    const codigo = this.codigoInput.trim();
    if (!codigo) {
      this.codigoSugerencias = [];
      this.mostrarSugerenciasCodigo = false;
      return;
    }

    this.servicioInventario.obtenerTodosInventario(1, this.sugerenciasCodigoLimite, codigo, '').subscribe({
      next: (response) => {
        this.codigoSugerencias = this.ordenarProductosPorCodigo(response?.data || [], codigo);
        this.sugerenciaCodigoActiva = 0;
        this.mostrarSugerenciasCodigo = this.codigoSugerencias.length > 0;
        this.estadoSupabase = 'Conectado a Supabase';
      },
      error: (err) => {
        this.codigoSugerencias = [];
        this.mostrarSugerenciasCodigo = false;
        this.estadoSupabase = 'Error de conexion con Supabase';
        const msg = String(err?.message || err?.error?.message || 'No se pudieron buscar los productos.');
        console.error('Supabase sugerencias productos2:', msg);
      },
    });
  }

  buscarSugerenciasDescripcion(): void {
    const descripcion = this.descripcionInput.trim();
    if (!descripcion) {
      this.descripcionSugerencias = [];
      this.mostrarSugerenciasDescripcion = false;
      return;
    }

    this.servicioInventario.obtenerTodosInventario(1, 12, '', descripcion).subscribe({
      next: (response) => {
        this.descripcionSugerencias = response?.data || [];
        this.mostrarSugerenciasDescripcion = this.descripcionSugerencias.length > 0;
        this.estadoSupabase = 'Conectado a Supabase';
      },
      error: (err) => {
        this.descripcionSugerencias = [];
        this.mostrarSugerenciasDescripcion = false;
        this.estadoSupabase = 'Error de conexion con Supabase';
        const msg = String(err?.message || err?.error?.message || 'No se pudieron buscar los productos.');
        console.error('Supabase sugerencias descripcion productos2:', msg);
      },
    });
  }

  onCodigoKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' && this.codigoSugerencias.length) {
      event.preventDefault();
      this.sugerenciaCodigoActiva = Math.min(this.sugerenciaCodigoActiva + 1, this.codigoSugerencias.length - 1);
      return;
    }

    if (event.key === 'ArrowUp' && this.codigoSugerencias.length) {
      event.preventDefault();
      this.sugerenciaCodigoActiva = Math.max(this.sugerenciaCodigoActiva - 1, 0);
      return;
    }

    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    if (!this.codigoInput.trim()) {
      this.descripcionInputRef?.nativeElement?.focus();
      this.descripcionInputRef?.nativeElement?.select();
      return;
    }

    const producto = this.codigoSugerencias[this.sugerenciaCodigoActiva];
    if (producto) {
      this.seleccionarProductoParaPrecio(producto);
      return;
    }

    this.buscarYAgregarPorCodigo();
  }

  onDescripcionKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' && this.descripcionSugerencias.length) {
      event.preventDefault();
      this.sugerenciaDescripcionActiva = Math.min(this.sugerenciaDescripcionActiva + 1, this.descripcionSugerencias.length - 1);
      return;
    }

    if (event.key === 'ArrowUp' && this.descripcionSugerencias.length) {
      event.preventDefault();
      this.sugerenciaDescripcionActiva = Math.max(this.sugerenciaDescripcionActiva - 1, 0);
      return;
    }

    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    const producto = this.descripcionSugerencias[this.sugerenciaDescripcionActiva];
    if (producto) {
      this.seleccionarProductoParaPrecio(producto);
      return;
    }

    this.buscarYAgregarPorDescripcion();
  }

  seleccionarSugerenciaCodigo(producto: ModeloInventarioData): void {
    this.seleccionarProductoParaPrecio(producto);
  }

  seleccionarSugerenciaDescripcion(producto: ModeloInventarioData): void {
    this.seleccionarProductoParaPrecio(producto);
  }

  buscarYAgregarPorCodigo(): void {
    const codigo = this.codigoInput.trim();
    if (!codigo) {
      return;
    }

    this.buscandoProductos = true;
    this.servicioInventario.obtenerTodosInventario(1, this.sugerenciasCodigoLimite, codigo, '').subscribe({
      next: (response) => {
        this.buscandoProductos = false;
        const productos: ModeloInventarioData[] = this.ordenarProductosPorCodigo(response?.data || [], codigo);
        const exacto = productos.find((producto) =>
          String((producto as any)?.in_codmerc || '').trim().toUpperCase() === codigo.toUpperCase()
        );
        const producto = exacto || productos[0];
        if (producto) {
          this.seleccionarProductoParaPrecio(producto);
          this.estadoSupabase = 'Conectado a Supabase';
          return;
        }
        Swal.fire('Producto no encontrado', `No se encontro producto con codigo ${codigo}.`, 'warning');
      },
      error: (err) => {
        this.buscandoProductos = false;
        this.estadoSupabase = 'Error de conexion con Supabase';
        const msg = String(err?.message || err?.error?.message || 'No se pudo buscar el producto.');
        console.error('Supabase buscar producto por codigo:', msg);
        Swal.fire('Error', 'No se pudo buscar el producto.', 'error');
      },
    });
  }

  buscarYAgregarPorDescripcion(): void {
    const descripcion = this.descripcionInput.trim();
    if (!descripcion) {
      return;
    }

    this.buscandoProductos = true;
    this.servicioInventario.obtenerTodosInventario(1, 12, '', descripcion).subscribe({
      next: (response) => {
        this.buscandoProductos = false;
        const productos: ModeloInventarioData[] = response?.data || [];
        const producto = productos[0];
        if (producto) {
          this.seleccionarProductoParaPrecio(producto);
          this.estadoSupabase = 'Conectado a Supabase';
          return;
        }
        Swal.fire('Producto no encontrado', `No se encontro producto con descripcion ${descripcion}.`, 'warning');
      },
      error: (err) => {
        this.buscandoProductos = false;
        this.estadoSupabase = 'Error de conexion con Supabase';
        const msg = String(err?.message || err?.error?.message || 'No se pudo buscar el producto.');
        console.error('Supabase buscar producto por descripcion:', msg);
        Swal.fire('Error', 'No se pudo buscar el producto.', 'error');
      },
    });
  }

  toggleProducto(producto: ModeloInventarioData, event: Event): void {
    const checked = !!((event.target as HTMLInputElement)?.checked);
    if (checked) {
      this.seleccionarProductoParaPrecio(producto);
      return;
    }

    const codigo = String((producto as any)?.in_codmerc || '').trim();
    if (!codigo) return;

    this.quitarProducto(codigo);
  }

  seleccionarProductoParaPrecio(producto: ModeloInventarioData): void {
    const codigo = String((producto as any)?.in_codmerc || '').trim();
    if (!codigo) return;

    const precioActual = this.costoActualProducto(producto);
    this.productoPendiente = producto;
    this.editandoCodigo = null;
    this.codigoInput = codigo;
    this.descripcionInput = String((producto as any)?.in_desmerc || '');
    this.precioActualInput = Number.isFinite(precioActual) ? precioActual : 0;
    this.precioNuevoInput = null;
    this.codigoSugerencias = [];
    this.descripcionSugerencias = [];
    this.mostrarSugerenciasCodigo = false;
    this.mostrarSugerenciasDescripcion = false;

    setTimeout(() => {
      this.precioNuevoInputRef?.nativeElement?.focus();
      this.precioNuevoInputRef?.nativeElement?.select();
    }, 0);
  }

  onPrecioNuevoKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    this.agregarProductoPendiente();
  }

  agregarProductoPendiente(): void {
    if (!this.productoPendiente) {
      Swal.fire('Producto requerido', 'Primero seleccione un producto por codigo o descripcion.', 'warning');
      return;
    }

    const precioNuevo = Number(this.precioNuevoInput);
    if (!Number.isFinite(precioNuevo) || precioNuevo <= 0) {
      Swal.fire('Precio requerido', 'Digite un precio nuevo mayor que cero.', 'warning');
      this.precioNuevoInputRef?.nativeElement?.focus();
      return;
    }

    this.agregarProducto(this.productoPendiente, precioNuevo);
  }

  editarProductoAgregado(item: ProductoPrecioSeleccionado): void {
    this.productoPendiente = {
      in_codmerc: item.codigo,
      in_desmerc: item.descripcion,
      in_cosmerc: item.costo ?? 0,
      in_premerc: item.precioActual,
    } as ModeloInventarioData;
    this.editandoCodigo = item.codigo;
    this.codigoInput = item.codigo;
    this.descripcionInput = item.descripcion;
    this.precioActualInput = item.precioActual;
    this.precioNuevoInput = item.nuevoPrecio;
    this.codigoSugerencias = [];
    this.descripcionSugerencias = [];
    this.mostrarSugerenciasCodigo = false;
    this.mostrarSugerenciasDescripcion = false;

    setTimeout(() => {
      this.precioNuevoInputRef?.nativeElement?.focus();
      this.precioNuevoInputRef?.nativeElement?.select();
    }, 0);
  }

  agregarProducto(producto: ModeloInventarioData, precioNuevoAplicar?: number): void {
    const codigo = String((producto as any)?.in_codmerc || '').trim();
    if (!codigo) return;

    const precioActual = this.costoActualProducto(producto);
    const costoRaw = (producto as any)?.in_cosmerc;
    const costo = costoRaw === null || costoRaw === undefined || costoRaw === ''
      ? null
      : Number(costoRaw);
    const precioNuevo = Number(precioNuevoAplicar ?? this.precioNuevoInput);
    const precioInicial = Number.isFinite(precioNuevo) && precioNuevo > 0
      ? precioNuevo
      : (Number.isFinite(precioActual) && precioActual > 0 ? precioActual : null);

    const existente = this.productosSeleccionados.find((item) => item.codigo === codigo);
    if (existente) {
      existente.nuevoPrecio = precioInicial;
      this.limpiarProductoPendiente(true);
      return;
    }

    this.productosSeleccionados.push({
      codigo,
      descripcion: String((producto as any)?.in_desmerc || ''),
      costo: costo === null ? null : (Number.isFinite(costo) ? costo : null),
      precioActual: Number.isFinite(precioActual) ? precioActual : 0,
      nuevoPrecio: precioInicial,
    });

    this.limpiarProductoPendiente(true);
  }

  private costoActualProducto(producto: any): number {
    const valor = producto?.in_costmerc ?? producto?.in_costmer ?? producto?.in_cosmerc ?? 0;
    const costo = Number(valor);
    return Number.isFinite(costo) ? costo : 0;
  }

  limpiarProductoPendiente(focusCodigo = false): void {
    this.productoPendiente = null;
    this.editandoCodigo = null;
    this.codigoInput = '';
    this.descripcionInput = '';
    this.precioActualInput = null;
    this.precioNuevoInput = null;
    this.codigoSugerencias = [];
    this.descripcionSugerencias = [];
    this.mostrarSugerenciasCodigo = false;
    this.mostrarSugerenciasDescripcion = false;

    if (focusCodigo) {
      setTimeout(() => {
        this.codigoInputRef?.nativeElement?.focus();
        this.codigoInputRef?.nativeElement?.select();
      }, 0);
    }
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
    this.limpiarProductoPendiente();
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
      Swal.fire('Dato invalido', `Revise el precio nuevo del producto ${productoInvalido.codigo}.`, 'warning');
      return;
    }

    this.guardando = true;
    this.servicioInventario.actualizarPreciosPorSucursales({
      productos: this.productosSeleccionados.map((item) => ({
        codigo: item.codigo,
        descripcion: item.descripcion,
        costo: item.costo,
        precioAnterior: item.precioActual,
        precio: Number(item.nuevoPrecio),
      })),
      sucursales,
    }).subscribe({
      next: (response) => {
        this.guardando = false;
        const data = response?.data || {};
        this.estadoSupabase = 'Conectado a Supabase';
        this.ultimoResultado = `Ultimo cambio en Supabase: ${Number(data.actualizados || 0)} actualizados, ${Number(data.insertados || 0)} creados, ${Number(data.historial || 0)} guardados en precio, ${Number(data.catalogoActualizados || 0)} productos2 actualizados.`;
        Swal.fire({
          title: 'Precios actualizados',
          text: `Actualizados: ${Number(data.actualizados || 0)}. Creados: ${Number(data.insertados || 0)}. Historial: ${Number(data.historial || 0)}. Productos2: ${Number(data.catalogoActualizados || 0)}.`,
          icon: 'success',
          timer: 2500,
          showConfirmButton: false,
        });
      },
      error: (err) => {
        this.guardando = false;
        this.estadoSupabase = 'Error de conexion con Supabase';
        const msg = String(err?.message || err?.error?.message || 'No se pudieron actualizar los precios');
        console.error('Supabase cambio de precios:', msg);
        Swal.fire('Error', msg, 'error');
      },
    });
  }
}
