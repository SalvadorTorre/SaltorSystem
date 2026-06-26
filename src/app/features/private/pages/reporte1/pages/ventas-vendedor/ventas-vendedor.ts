import { Component, OnInit } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ServicioFacturacion } from 'src/app/core/services/facturacion/factura/factura.service';
import { SucursalesData } from 'src/app/core/services/mantenimientos/sucursal';
import { ServicioSucursal } from 'src/app/core/services/mantenimientos/sucursal/sucursal.service';

interface VentaConsulta {
  vendedor: string;
  empresaCodigo: string;
  sucursalId: number;
  total: number;
  costo: number;
}

interface ResumenVendedor {
  vendedor: string;
  total: number;
  costo: number;
  facturas: number;
  empresas: string[];
  sucursales: number[];
}

@Component({
  selector: 'app-ventas-vendedor',
  templateUrl: './ventas-vendedor.html',
  styleUrls: ['./ventas-vendedor.css'],
})
export class VentasVendedor implements OnInit {
  sucursales: SucursalesData[] = [];
  empresas: string[] = ['todas'];

  filtros = {
    empresa: 'todas',
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
        this.empresas = this.buildOptions(this.sucursales.map((sucursal) => sucursal.cod_empre), 'todas');
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
    this.cargando = true;
    this.error = '';

    this.facturacionSrv.buscarConsultaVentas({
      empresa: this.filtros.empresa,
      sucursal: this.filtros.sucursal,
      fechaDesde: this.filtros.fechaInicio,
      fechaHasta: this.filtros.fechaFin,
      pageSize: 0,
      incluirTodasLasEmpresas: true,
    }).subscribe({
      next: (resp: any) => {
        const rows = Array.isArray(resp?.data) ? resp.data : [];
        this.ventas = rows.map((row: any) => this.mapVenta(row));
        this.actualizarEmpresasDesdeVentas();
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
      empresa: 'todas',
      sucursal: 0,
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

  get ticketPromedio(): number {
    return this.totalFacturas ? this.totalVendido / this.totalFacturas : 0;
  }

  get sucursalesActivas(): number {
    return new Set(this.ventas.map((venta) => venta.sucursalId).filter(Boolean)).size;
  }

  get vendedorLider(): ResumenVendedor | null {
    return this.vendedores[0] || null;
  }

  get margenVentas(): number {
    return this.calcularMargen(this.totalVendido, this.totalCosto);
  }

  margenVendedor(vendedor: ResumenVendedor): number {
    return this.calcularMargen(vendedor.total, vendedor.costo);
  }

  ticketPromedioVendedor(vendedor: ResumenVendedor): number {
    return vendedor.facturas ? vendedor.total / vendedor.facturas : 0;
  }

  participacionVendedor(vendedor: ResumenVendedor): number {
    return this.totalVendido ? (vendedor.total / this.totalVendido) * 100 : 0;
  }

  barraVendedor(vendedor: ResumenVendedor): number {
    const maximo = this.vendedores[0]?.total || 0;
    if (!maximo) return 0;
    return Math.max(6, Math.min(100, (vendedor.total / maximo) * 100));
  }

  exportarPdf(): void {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const generado = new Date().toLocaleString('es-DO');
    const periodo = `${this.formatFecha(this.filtros.fechaInicio)} - ${this.formatFecha(this.filtros.fechaFin)}`;

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Ventas por vendedor', 14, 13);
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
    doc.text(`Empresa: ${this.nombreEmpresaSeleccionada()}`, 14, 44);
    doc.text(`Sucursal: ${this.nombreSucursalSeleccionada()}`, 88, 44);

    const kpis = [
      ['Total vendido', this.formatMoney(this.totalVendido)],
      ['Facturas', String(this.totalFacturas)],
      ['Ticket promedio', this.formatMoney(this.ticketPromedio)],
      ['Margen', `${this.margenVentas.toFixed(2)}%`],
      ['Vendedores', String(this.vendedores.length)],
      ['Sucursales', String(this.sucursalesActivas)],
    ];
    this.dibujarKpisPdf(doc, kpis, 14, 52, pageWidth - 28);

    autoTable(doc, {
      startY: 78,
      head: [['Rank', 'Vendedor', 'Participacion', 'Total vendido', 'Facturas', 'Ticket prom.', 'Margen', 'Empresas', 'Sucursales']],
      body: this.vendedores.map((vendedor, index) => [
        `#${index + 1}`,
        vendedor.vendedor,
        `${this.participacionVendedor(vendedor).toFixed(2)}%`,
        this.formatMoney(vendedor.total),
        String(vendedor.facturas),
        this.formatMoney(this.ticketPromedioVendedor(vendedor)),
        `${this.margenVendedor(vendedor).toFixed(2)}%`,
        String(vendedor.empresas.length),
        String(vendedor.sucursales.length),
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [21, 94, 117],
        fontStyle: 'bold',
        fontSize: 7.8,
        textColor: 255,
      },
      bodyStyles: {
        fontSize: 7.4,
        textColor: [30, 41, 59],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 14 },
        1: { cellWidth: 54 },
        2: { halign: 'right', cellWidth: 24 },
        3: { halign: 'right', cellWidth: 34 },
        4: { halign: 'right', cellWidth: 20 },
        5: { halign: 'right', cellWidth: 34 },
        6: { halign: 'right', cellWidth: 20 },
        7: { halign: 'right', cellWidth: 20 },
        8: { halign: 'right', cellWidth: 22 },
      },
      margin: { left: 14, right: 14 },
      didDrawPage: () => this.dibujarPiePdf(doc),
    });

    doc.save(`ventas-vendedor-${this.filtros.fechaInicio}-${this.filtros.fechaFin}.pdf`);
  }

  nombreSucursalSeleccionada(): string {
    return this.filtros.sucursal ? this.nombreSucursal(this.filtros.sucursal) : 'Todas las sucursales';
  }

  nombreEmpresaSeleccionada(): string {
    return this.filtros.empresa === 'todas' ? 'Todas las empresas' : this.filtros.empresa;
  }

  formatMoney(valor: number): string {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor || 0);
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '';
    const [yyyy, mm, dd] = fecha.split('-');
    return `${dd}/${mm}/${yyyy}`;
  }

  private seleccionarSucursalInicial(): void {
    this.filtros.sucursal = 0;
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
        empresas: [],
        sucursales: [],
      };

      actual.total += venta.total;
      actual.costo += venta.costo;
      actual.facturas += 1;
      if (venta.empresaCodigo && !actual.empresas.includes(venta.empresaCodigo)) {
        actual.empresas.push(venta.empresaCodigo);
      }
      if (venta.sucursalId && !actual.sucursales.includes(venta.sucursalId)) {
        actual.sucursales.push(venta.sucursalId);
      }
      resumen.set(vendedor, actual);
    });

    return Array.from(resumen.values()).sort((a, b) => b.total - a.total);
  }

  private calcularMargen(total: number, costo: number): number {
    if (!costo) return 0;
    return ((total - costo) / costo) * 100;
  }

  private mapVenta(row: any): VentaConsulta {
    const sucursalId = Number(row?.fa_codSucu ?? row?.fa_codsucu ?? 0) || 0;
    return {
      vendedor: String(
        row?.fa_nomVend ?? row?.fa_nomvend ?? row?.fa_codVend ?? row?.fa_codvend ?? 'Sin vendedor',
      ).trim() || 'Sin vendedor',
      empresaCodigo: String(row?.fa_codEmpr ?? row?.fa_codempr ?? '').trim() || 'N/D',
      sucursalId,
      total: Number(row?.fa_valFact ?? row?.fa_valfact ?? row?.fa_total ?? row?.total ?? 0) || 0,
      costo: Number(row?.fa_cosFact ?? row?.fa_cosfact ?? 0) || 0,
    };
  }

  private nombreSucursal(codigo: number): string {
    const sucursal = this.sucursales.find(
      (item) => Number(item?.cod_sucursal) === Number(codigo),
    );
    return sucursal?.nom_sucursal || (codigo ? `Sucursal ${codigo}` : 'Todas las sucursales');
  }

  private actualizarEmpresasDesdeVentas(): void {
    const empresasDesdeSucursales = this.sucursales.map((sucursal) => sucursal.cod_empre);
    const empresasDesdeVentas = this.ventas.map((venta) => venta.empresaCodigo);
    this.empresas = this.buildOptions([...empresasDesdeSucursales, ...empresasDesdeVentas], 'todas');
    if (!this.empresas.includes(this.filtros.empresa)) {
      this.filtros.empresa = 'todas';
    }
  }

  private buildOptions(values: any[], firstOption: string): string[] {
    const unique = Array.from(
      new Set(
        values
          .map((value) => String(value || '').trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));
    return [firstOption, ...unique.filter((value) => value !== firstOption)];
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
}
