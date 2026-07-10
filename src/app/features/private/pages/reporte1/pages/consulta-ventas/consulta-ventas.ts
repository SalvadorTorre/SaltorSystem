import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { SucursalesData } from 'src/app/core/services/mantenimientos/sucursal';
import { ServicioSucursal } from 'src/app/core/services/mantenimientos/sucursal/sucursal.service';
import { ServicioEmpresa } from 'src/app/core/services/mantenimientos/empresas/empresas.service';

interface VentaConsulta {
  fecha: string;
  documento: string;
  empresaCodigo: string;
  empresa: string;
  sucursalId: number;
  sucursal: string;
  vendedor: string;
  cliente: string;
  total: number;
  costo: number;
}

interface ResumenGrupoVentas {
  codigo: string;
  nombre: string;
  total: number;
  metaVenta: number;
  operaciones: number;
  participacion: number;
}

@Component({
  selector: 'app-consulta-ventas',
  templateUrl: './consulta-ventas.html',
  styleUrls: ['./consulta-ventas.css']
})
export class ConsultaVentas implements OnInit {
  sucursales: SucursalesData[] = [];
  empresasCatalogo: any[] = [];
  empresas = ['todas'];
  vendedores = ['todos'];

  filtros = {
    empresa: 'todas',
    sucursal: 0,
    vendedor: 'todos',
    fechaInicio: this.fechaHoy(),
    fechaFin: this.fechaHoy()
  };

  cargando = false;
  error = '';
  private ventas: VentaConsulta[] = [];
  private ventasAyer: VentaConsulta[] = [];
  resultados: VentaConsulta[] = [];
  pageSize = 10;
  currentPage = 1;

  constructor(
    private readonly facturacionSrv: ServicioFacturacion,
    private readonly sucursalSrv: ServicioSucursal,
    private readonly empresaSrv: ServicioEmpresa
  ) {}

  ngOnInit(): void {
    this.cargarSucursales();
  }

  cargarSucursales(): void {
    this.cargando = true;
    this.error = '';

    forkJoin({
      sucursales: this.sucursalSrv.buscarTodasSucursal(),
      empresas: this.empresaSrv.buscarTodasEmpresa(1, 10000),
    }).subscribe({
      next: ({ sucursales, empresas }: any) => {
        this.sucursales = Array.isArray(sucursales?.data) ? sucursales.data : [];
        this.empresasCatalogo = Array.isArray(empresas?.data) ? empresas.data : [];
        this.cargarVentas();
      },
      error: (err: any) => {
        this.error = String(err?.message || 'No se pudieron cargar las sucursales o empresas.');
        this.sucursales = [];
        this.empresasCatalogo = [];
        this.cargarVentas();
      }
    });
  }

  cargarVentas(): void {
    this.cargando = true;
    this.error = '';

    const paramsBase = {
      empresa: this.filtros.empresa,
      sucursal: this.filtros.sucursal,
      pageSize: 0,
      incluirTodasLasEmpresas: true
    };
    const ayer = this.fechaAyer();

    forkJoin({
      periodo: this.facturacionSrv.buscarConsultaVentas({
        ...paramsBase,
        fechaDesde: this.filtros.fechaInicio,
        fechaHasta: this.filtros.fechaFin,
      }),
      ayer: this.facturacionSrv.buscarConsultaVentas({
        ...paramsBase,
        fechaDesde: ayer,
        fechaHasta: ayer,
      }),
    }).subscribe({
      next: ({ periodo, ayer }: any) => {
        const rows = Array.isArray(periodo?.data) ? periodo.data : [];
        const rowsAyer = Array.isArray(ayer?.data) ? ayer.data : [];
        this.ventas = rows.map((row: any) => this.mapVenta(row));
        this.ventasAyer = rowsAyer.map((row: any) => this.mapVenta(row));
        this.actualizarEmpresasDesdeVentas();
        this.actualizarVendedoresDesdeVentas();
        this.aplicarFiltroLocal();
        this.cargando = false;
      },
      error: (err: any) => {
        this.error = String(err?.message || 'No se pudieron cargar las ventas.');
        this.ventas = [];
        this.ventasAyer = [];
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

  actualizarEmpresasDesdeVentas(): void {
    const empresasDesdeSucursales = this.sucursales.map((sucursal) => sucursal.cod_empre);
    const empresasDesdeVentas = this.ventas.map((venta) => venta.empresaCodigo);
    this.empresas = this.buildOptions([...empresasDesdeSucursales, ...empresasDesdeVentas], 'todas');
    if (!this.empresas.includes(this.filtros.empresa)) {
      this.filtros.empresa = 'todas';
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
      empresa: 'todas',
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

  get totalVendidoAyer(): number {
    return this.ventasAyer
      .filter((venta) => this.filtros.vendedor === 'todos' || venta.vendedor === this.filtros.vendedor)
      .reduce((total, venta) => total + venta.total, 0);
  }

  get diferenciaVsAyer(): number {
    return this.totalVendido - this.totalVendidoAyer;
  }

  get porcentajeVsAyer(): number {
    if (!this.totalVendidoAyer) return this.totalVendido ? 100 : 0;
    return (this.diferenciaVsAyer / this.totalVendidoAyer) * 100;
  }

  get operaciones(): number {
    return this.resultados.length;
  }

  get ticketPromedio(): number {
    return this.operaciones ? this.totalVendido / this.operaciones : 0;
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

  get sucursalesActivas(): number {
    return new Set(this.resultados.map((venta) => venta.sucursalId).filter(Boolean)).size;
  }

  get resumenPorEmpresa(): ResumenGrupoVentas[] {
    return this.resumenPor((venta) => ({
      codigo: venta.empresaCodigo || 'N/D',
      nombre: venta.empresa || 'Sin empresa',
    }));
  }

  get resumenPorSucursal(): ResumenGrupoVentas[] {
    return this.resumenPor((venta) => ({
      codigo: String(venta.sucursalId || 'N/D'),
      nombre: venta.sucursal || 'Sin sucursal',
      metaVenta: this.metaVentasSucursal(venta.sucursalId),
    }));
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

  variacionClase(value: number): string {
    if (value > 0) return 'is-up';
    if (value < 0) return 'is-down';
    return 'is-flat';
  }

  exportarVentas(): void {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const generado = new Date().toLocaleString('es-DO');
    const periodo = `${this.formatFecha(this.filtros.fechaInicio)} - ${this.formatFecha(this.filtros.fechaFin)}`;
    const empresa = this.filtros.empresa === 'todas' ? 'Todas las empresas' : this.filtros.empresa;
    const sucursal = this.filtros.sucursal ? this.nombreSucursal(this.filtros.sucursal) : 'Todas las sucursales';
    const vendedor = this.filtros.vendedor === 'todos' ? 'Todos los vendedores' : this.filtros.vendedor;

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Dashboard de ventas', 14, 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Periodo: ${periodo}`, 14, 20);
    doc.text(`Generado: ${generado}`, pageWidth - 14, 20, { align: 'right' });

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Filtros aplicados', 14, 38);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Empresa: ${empresa}`, 14, 44);
    doc.text(`Sucursal: ${sucursal}`, 88, 44);
    doc.text(`Vendedor: ${vendedor}`, 176, 44);

    const kpis = [
      ['Total vendido', this.formatMoney(this.totalVendido)],
      ['Ventas ayer', this.formatMoney(this.totalVendidoAyer)],
      ['Diferencia vs ayer', this.formatMoney(this.diferenciaVsAyer)],
      ['Facturas', String(this.operaciones)],
      ['Ticket promedio', this.formatMoney(this.ticketPromedio)],
      ['Margen', `${this.margenVentas.toFixed(2)}%`],
    ];
    this.dibujarKpisPdf(doc, kpis, 14, 52, pageWidth - 28);

    autoTable(doc, {
      startY: 78,
      head: [['Fecha', 'Empresa', 'Sucursal', 'Factura', 'Vendedor', 'Cliente', 'Total', 'Costo', 'Margen']],
      body: this.resultados.map((venta) => [
        this.formatFecha(venta.fecha),
        venta.empresa,
        venta.sucursal,
        venta.documento,
        venta.vendedor,
        venta.cliente,
        this.formatMoney(venta.total),
        this.formatMoney(venta.costo),
        `${this.margenFactura(venta).toFixed(2)}%`,
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [21, 94, 117],
        fontStyle: 'bold',
        fontSize: 7.5,
        textColor: 255,
      },
      bodyStyles: {
        fontSize: 7.2,
        textColor: [30, 41, 59],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 22 },
        2: { cellWidth: 30 },
        3: { cellWidth: 24 },
        4: { cellWidth: 34 },
        5: { cellWidth: 48 },
        6: { halign: 'right', cellWidth: 25 },
        7: { halign: 'right', cellWidth: 25 },
        8: { halign: 'right', cellWidth: 18 },
      },
      margin: { left: 14, right: 14 },
      didDrawPage: () => this.dibujarPiePdf(doc),
    });

    doc.save(`dashboard-ventas-${this.filtros.fechaInicio}-${this.filtros.fechaFin}.pdf`);
  }

  private mapVenta(row: any): VentaConsulta {
    const sucursalId = Number(row?.fa_codSucu ?? row?.fa_codsucu ?? 0) || 0;
    const empresaCodigo = String(row?.fa_codEmpr ?? row?.fa_codempr ?? '').trim() || 'N/D';
    return {
      fecha: this.normalizarFecha(row?.fa_fecFact ?? row?.fa_fecfact),
      documento: String(row?.fa_codFact ?? row?.fa_codfact ?? ''),
      empresaCodigo,
      empresa: this.nombreEmpresa(empresaCodigo),
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

  metaVentasSucursal(codigo: number): number {
    const sucursal = this.sucursales.find((item) => Number(item?.cod_sucursal) === Number(codigo));
    const meta = Number(
      sucursal?.meta_ventas ??
      sucursal?.meta_vents ??
      sucursal?.metaVenta ??
      0
    );
    return Number.isFinite(meta) ? meta : 0;
  }

  nombreEmpresa(codigo: string): string {
    const value = String(codigo || '').trim();
    if (!value || value === 'N/D') return 'Sin empresa';
    const empresa = this.empresasCatalogo.find((item) =>
      String(item?.cod_empre || '').trim().toUpperCase() === value.toUpperCase()
    );
    const nombre = String(empresa?.nom_empre || '').trim();
    return nombre ? `${value} - ${nombre}` : value;
  }

  private resumenPor(selector: (venta: VentaConsulta) => { codigo: string; nombre: string; metaVenta?: number }): ResumenGrupoVentas[] {
    const map = new Map<string, ResumenGrupoVentas>();
    this.resultados.forEach((venta) => {
      const group = selector(venta);
      const key = group.codigo || group.nombre;
      const actual = map.get(key) || {
        codigo: group.codigo,
        nombre: group.nombre,
        total: 0,
        metaVenta: Number(group.metaVenta || 0),
        operaciones: 0,
        participacion: 0,
      };
      actual.total += venta.total;
      actual.metaVenta = Number(group.metaVenta || actual.metaVenta || 0);
      actual.operaciones += 1;
      map.set(key, actual);
    });
    return Array.from(map.values())
      .map((item) => ({
        ...item,
        participacion: this.totalVendido ? (item.total / this.totalVendido) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }

  private dibujarKpisPdf(doc: jsPDF, kpis: string[][], x: number, y: number, totalWidth: number): void {
    const gap = 3;
    const width = (totalWidth - gap * (kpis.length - 1)) / kpis.length;
    kpis.forEach(([label, value], index) => {
      const left = x + index * (width + gap);
      doc.setFillColor(index === 0 ? 236 : 248, index === 0 ? 253 : 250, index === 0 ? 245 : 252);
      doc.setDrawColor(219, 229, 239);
      doc.roundedRect(left, y, width, 17, 2.5, 2.5, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text(label.toUpperCase(), left + 3, y + 6);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(8.6);
      doc.text(value, left + 3, y + 13);
    });
  }

  private dibujarPiePdf(doc: jsPDF): void {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageNumber = doc.getNumberOfPages();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Saltor System · Reportes comerciales', 14, pageHeight - 8);
    doc.text(`Pagina ${pageNumber}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
  }

  private fechaHoy(): string {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private fechaAyer(): string {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const yyyy = ayer.getFullYear();
    const mm = String(ayer.getMonth() + 1).padStart(2, '0');
    const dd = String(ayer.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
