import { Component, OnInit } from '@angular/core';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { SucursalesData } from 'src/app/core/services/mantenimientos/sucursal';
import { ServicioSucursal } from 'src/app/core/services/mantenimientos/sucursal/sucursal.service';

interface VentaConsulta {
  vendedor: string;
  total: number;
  costo: number;
}

interface ResumenVendedor {
  vendedor: string;
  total: number;
  costo: number;
  facturas: number;
}

@Component({
  selector: 'app-ventas-vendedor',
  templateUrl: './ventas-vendedor.html',
  styleUrls: ['./ventas-vendedor.css'],
})
export class VentasVendedor implements OnInit {
  sucursales: SucursalesData[] = [];

  filtros = {
    sucursal: 0,
    fechaInicio: this.fechaHoy(),
    fechaFin: this.fechaHoy(),
  };

  cargando = false;
  error = '';
  ventas: VentaConsulta[] = [];
  vendedores: ResumenVendedor[] = [];

  constructor(
    private readonly facturacionSrv: ServicioFacturacion,
    private readonly sucursalSrv: ServicioSucursal,
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
        this.seleccionarSucursalInicial();
        this.cargarVentas();
      },
      error: (err: any) => {
        this.error = String(err?.message || 'No se pudieron cargar las sucursales.');
        this.sucursales = [];
        this.vendedores = [];
        this.cargando = false;
      },
    });
  }

  cargarVentas(): void {
    if (!this.filtros.sucursal) {
      this.ventas = [];
      this.vendedores = [];
      this.cargando = false;
      return;
    }

    this.cargando = true;
    this.error = '';

    this.facturacionSrv.buscarConsultaVentas({
      sucursal: this.filtros.sucursal,
      fechaDesde: this.filtros.fechaInicio,
      fechaHasta: this.filtros.fechaFin,
      pageSize: 5000,
      incluirTodasLasEmpresas: true,
    }).subscribe({
      next: (resp: any) => {
        const rows = Array.isArray(resp?.data) ? resp.data : [];
        this.ventas = rows.map((row: any) => this.mapVenta(row));
        this.vendedores = this.agruparPorVendedor(this.ventas);
        this.cargando = false;
      },
      error: (err: any) => {
        this.error = String(err?.message || 'No se pudieron cargar las ventas.');
        this.ventas = [];
        this.vendedores = [];
        this.cargando = false;
      },
    });
  }

  consultar(): void {
    this.cargarVentas();
  }

  limpiar(): void {
    this.filtros = {
      sucursal: this.sucursalPorDefecto(),
      fechaInicio: this.fechaHoy(),
      fechaFin: this.fechaHoy(),
    };
    this.cargarVentas();
  }

  get totalVendido(): number {
    return this.vendedores.reduce((total, vendedor) => total + vendedor.total, 0);
  }

  get totalCosto(): number {
    return this.vendedores.reduce((total, vendedor) => total + vendedor.costo, 0);
  }

  get totalFacturas(): number {
    return this.vendedores.reduce((total, vendedor) => total + vendedor.facturas, 0);
  }

  get margenVentas(): number {
    return this.calcularMargen(this.totalVendido, this.totalCosto);
  }

  margenVendedor(vendedor: ResumenVendedor): number {
    return this.calcularMargen(vendedor.total, vendedor.costo);
  }

  nombreSucursalSeleccionada(): string {
    return this.nombreSucursal(this.filtros.sucursal);
  }

  formatMoney(valor: number): string {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor || 0);
  }

  private seleccionarSucursalInicial(): void {
    this.filtros.sucursal = this.sucursalPorDefecto();
  }

  private sucursalPorDefecto(): number {
    const sucursalUsuario = Number(localStorage.getItem('idSucursal') || 0);
    const existeSucursalUsuario = this.sucursales.some(
      (sucursal) => Number(sucursal?.cod_sucursal) === sucursalUsuario,
    );
    if (sucursalUsuario > 0 && existeSucursalUsuario) return sucursalUsuario;
    return Number(this.sucursales[0]?.cod_sucursal || 0);
  }

  private agruparPorVendedor(ventas: VentaConsulta[]): ResumenVendedor[] {
    const resumen = new Map<string, ResumenVendedor>();

    ventas.forEach((venta) => {
      const vendedor = venta.vendedor || 'Sin vendedor';
      const actual = resumen.get(vendedor) || {
        vendedor,
        total: 0,
        costo: 0,
        facturas: 0,
      };

      actual.total += venta.total;
      actual.costo += venta.costo;
      actual.facturas += 1;
      resumen.set(vendedor, actual);
    });

    return Array.from(resumen.values()).sort((a, b) => b.total - a.total);
  }

  private calcularMargen(total: number, costo: number): number {
    if (!costo) return 0;
    return ((total - costo) / costo) * 100;
  }

  private mapVenta(row: any): VentaConsulta {
    return {
      vendedor: String(
        row?.fa_nomVend ?? row?.fa_nomvend ?? row?.fa_codVend ?? row?.fa_codvend ?? 'Sin vendedor',
      ).trim() || 'Sin vendedor',
      total: Number(row?.fa_valFact ?? row?.fa_valfact ?? row?.fa_total ?? row?.total ?? 0) || 0,
      costo: Number(row?.fa_cosFact ?? row?.fa_cosfact ?? 0) || 0,
    };
  }

  private nombreSucursal(codigo: number): string {
    const sucursal = this.sucursales.find(
      (item) => Number(item?.cod_sucursal) === Number(codigo),
    );
    return sucursal?.nom_sucursal || (codigo ? `Sucursal ${codigo}` : 'Seleccione sucursal');
  }

  private fechaHoy(): string {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
