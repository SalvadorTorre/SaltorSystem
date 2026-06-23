import { Component, OnInit } from '@angular/core';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { SucursalesData } from 'src/app/core/services/mantenimientos/sucursal';
import { ServicioSucursal } from 'src/app/core/services/mantenimientos/sucursal/sucursal.service';

interface VentaConsulta {
  fecha: string;
  documento: string;
  sucursalId: number;
  sucursal: string;
  vendedor: string;
  cliente: string;
  total: number;
  costo: number;
}

@Component({
  selector: 'app-consulta-ventas',
  templateUrl: './consulta-ventas.html',
  styleUrls: ['./consulta-ventas.css']
})
export class ConsultaVentas implements OnInit {
  sucursales: SucursalesData[] = [];
  vendedores = ['todos'];

  filtros = {
    sucursal: 0,
    vendedor: 'todos',
    fechaInicio: this.fechaHoy(),
    fechaFin: this.fechaHoy()
  };

  cargando = false;
  error = '';
  private ventas: VentaConsulta[] = [];
  resultados: VentaConsulta[] = [];
  pageSize = 10;
  currentPage = 1;

  constructor(
    private readonly facturacionSrv: ServicioFacturacion,
    private readonly sucursalSrv: ServicioSucursal
  ) {}

  ngOnInit(): void {
    this.cargarSucursales();
  }

  cargarSucursales(): void {
    this.cargando = true;
    this.error = '';

    this.sucursalSrv.buscarTodasSucursal().subscribe({
      next: (resp: any) => {
        this.sucursales = Array.isArray(resp?.data) ? resp.data : [];
        this.cargarVentas();
      },
      error: (err: any) => {
        this.error = String(err?.message || 'No se pudieron cargar las sucursales.');
        this.sucursales = [];
        this.cargarVentas();
      }
    });
  }

  cargarVentas(): void {
    this.cargando = true;
    this.error = '';

    this.facturacionSrv.buscarConsultaVentas({
      sucursal: this.filtros.sucursal,
      fechaDesde: this.filtros.fechaInicio,
      fechaHasta: this.filtros.fechaFin,
      pageSize: 5000,
      incluirTodasLasEmpresas: true
    }).subscribe({
      next: (resp: any) => {
        const rows = Array.isArray(resp?.data) ? resp.data : [];
        this.ventas = rows.map((row: any) => this.mapVenta(row));
        this.actualizarVendedoresDesdeVentas();
        this.aplicarFiltroLocal();
        this.cargando = false;
      },
      error: (err: any) => {
        this.error = String(err?.message || 'No se pudieron cargar las ventas.');
        this.ventas = [];
        this.resultados = [];
        this.currentPage = 1;
        this.cargando = false;
      }
    });
  }

  actualizarVendedoresDesdeVentas(): void {
    this.vendedores = this.buildOptions(this.ventas.map((venta) => venta.vendedor), 'todos');
    if (!this.vendedores.includes(this.filtros.vendedor)) {
      this.filtros.vendedor = 'todos';
    }
  }

  consultar(): void {
    this.cargarVentas();
  }

  aplicarFiltroLocal(): void {
    this.resultados = this.ventas.filter((venta) => {
      const coincideVendedor = this.filtros.vendedor === 'todos' || venta.vendedor === this.filtros.vendedor;

      return coincideVendedor;
    });
    this.currentPage = 1;
  }

  limpiar(): void {
    this.filtros = {
      sucursal: 0,
      vendedor: 'todos',
      fechaInicio: this.fechaHoy(),
      fechaFin: this.fechaHoy()
    };
    this.cargarVentas();
  }

  get totalVendido(): number {
    return this.resultados.reduce((total, venta) => total + venta.total, 0);
  }

  get operaciones(): number {
    return this.resultados.length;
  }

  get totalCosto(): number {
    return this.resultados.reduce((total, venta) => total + venta.costo, 0);
  }

  get margenVentas(): number {
    if (!this.totalCosto) return 0;
    return ((this.totalVendido - this.totalCosto) / this.totalCosto) * 100;
  }

  margenFactura(venta: VentaConsulta): number {
    const costo = Number(venta?.costo || 0);
    if (!costo) return 0;
    return ((Number(venta?.total || 0) - costo) / costo) * 100;
  }

  get vendedoresActivos(): number {
    return new Set(this.resultados.map((venta) => venta.vendedor)).size;
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.resultados.length / this.pageSize));
  }

  get resultadosPagina(): VentaConsulta[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.resultados.slice(start, start + this.pageSize);
  }

  get registroInicialPagina(): number {
    if (!this.resultados.length) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get registroFinalPagina(): number {
    return Math.min(this.currentPage * this.pageSize, this.resultados.length);
  }

  get paginasVisibles(): number[] {
    const total = this.totalPaginas;
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(total, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  irPagina(page: number): void {
    const nextPage = Math.min(Math.max(Number(page) || 1, 1), this.totalPaginas);
    this.currentPage = nextPage;
  }

  paginaAnterior(): void {
    this.irPagina(this.currentPage - 1);
  }

  paginaSiguiente(): void {
    this.irPagina(this.currentPage + 1);
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '';
    const [yyyy, mm, dd] = fecha.split('-');
    return `${dd}/${mm}/${yyyy}`;
  }

  formatMoney(valor: number): string {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor);
  }

  private mapVenta(row: any): VentaConsulta {
    const sucursalId = Number(row?.fa_codSucu ?? row?.fa_codsucu ?? 0) || 0;
    return {
      fecha: this.normalizarFecha(row?.fa_fecFact ?? row?.fa_fecfact),
      documento: String(row?.fa_codFact ?? row?.fa_codfact ?? ''),
      sucursalId,
      sucursal: this.nombreSucursal(sucursalId),
      vendedor: String(row?.fa_nomVend ?? row?.fa_nomvend ?? row?.fa_codVend ?? row?.fa_codvend ?? 'Sin vendedor').trim() || 'Sin vendedor',
      cliente: String(row?.fa_nomClie ?? row?.fa_nomclie ?? 'Sin cliente').trim() || 'Sin cliente',
      total: Number(row?.fa_valFact ?? row?.fa_valfact ?? row?.fa_total ?? row?.total ?? 0) || 0,
      costo: Number(row?.fa_cosFact ?? row?.fa_cosfact ?? 0) || 0
    };
  }

  private normalizarFecha(value: any): string {
    if (!value) return '';
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }
    const text = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? text.slice(0, 10) : parsed.toISOString().slice(0, 10);
  }

  private buildOptions(values: string[], first: string): string[] {
    const unique = Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
    return [first, ...unique.sort((a, b) => a.localeCompare(b))];
  }

  nombreSucursal(codigo: number): string {
    const sucursal = this.sucursales.find((item) => Number(item?.cod_sucursal) === Number(codigo));
    return sucursal?.nom_sucursal || (codigo ? `Sucursal ${codigo}` : 'Sin sucursal');
  }

  private fechaHoy(): string {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
