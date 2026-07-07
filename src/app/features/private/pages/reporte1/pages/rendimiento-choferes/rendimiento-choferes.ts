import { Component, OnInit } from '@angular/core';
import { SupabaseService } from 'src/app/core/services/supabase/supabase.service';
import { SucursalesData } from 'src/app/core/services/mantenimientos/sucursal';
import { ServicioSucursal } from 'src/app/core/services/mantenimientos/sucursal/sucursal.service';

interface SalidaControlRow {
  id: number;
  idsucursal: number;
  codsalida: string;
  fecsalida: string;
  codchofer: number | null;
  nomchofer: string | null;
}

interface DetSalidaRow {
  idsalida: number;
  codsalida: string;
  codfact: string;
  valfact: number;
}

interface ResumenChofer {
  codchofer: string;
  nomchofer: string;
  facturas: number;
  total: number;
  controles: number;
  sucursales: number[];
  ultimaSalida: string;
}

@Component({
  selector: 'app-rendimiento-choferes',
  templateUrl: './rendimiento-choferes.html',
  styleUrls: ['./rendimiento-choferes.css'],
})
export class RendimientoChoferes implements OnInit {
  sucursales: SucursalesData[] = [];
  filtros = {
    sucursal: 0,
    fechaInicio: this.inicioMes(),
    fechaFin: this.fechaHoy(),
  };

  cargando = false;
  error = '';
  salidas: SalidaControlRow[] = [];
  detalles: DetSalidaRow[] = [];
  choferes: ResumenChofer[] = [];

  constructor(
    private readonly supabase: SupabaseService,
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
        void this.cargarRendimiento();
      },
      error: (err: any) => {
        this.error = String(err?.message || 'No se pudieron cargar las sucursales.');
        this.sucursales = [];
        this.choferes = [];
        this.cargando = false;
      },
    });
  }

  consultar(): void {
    void this.cargarRendimiento();
  }

  limpiar(): void {
    this.filtros = {
      sucursal: this.sucursalPorDefecto(),
      fechaInicio: this.inicioMes(),
      fechaFin: this.fechaHoy(),
    };
    void this.cargarRendimiento();
  }

  async cargarRendimiento(): Promise<void> {
    const db = this.db();
    if (!db) {
      this.error = 'Supabase no esta configurado.';
      this.cargando = false;
      return;
    }

    this.cargando = true;
    this.error = '';

    try {
      this.salidas = await this.fetchSalidas();
      this.detalles = await this.fetchDetalles(this.salidas.map((salida) => salida.id).filter(Boolean));
      this.choferes = this.agruparChoferes(this.salidas, this.detalles);
    } catch (err: any) {
      this.error = String(err?.message || 'No se pudo cargar el rendimiento de choferes.');
      this.salidas = [];
      this.detalles = [];
      this.choferes = [];
    } finally {
      this.cargando = false;
    }
  }

  get totalAsignado(): number {
    return this.choferes.reduce((total, chofer) => total + chofer.total, 0);
  }

  get totalFacturas(): number {
    return this.choferes.reduce((total, chofer) => total + chofer.facturas, 0);
  }

  get totalControles(): number {
    return new Set(this.salidas.map((salida) => salida.id)).size;
  }

  get choferLider(): ResumenChofer | null {
    return this.choferes[0] || null;
  }

  promedioChofer(chofer: ResumenChofer): number {
    return chofer.facturas ? chofer.total / chofer.facturas : 0;
  }

  participacionChofer(chofer: ResumenChofer): number {
    return this.totalAsignado ? (chofer.total / this.totalAsignado) * 100 : 0;
  }

  barraChofer(chofer: ResumenChofer): number {
    const maximo = this.choferes[0]?.total || 0;
    if (!maximo) return 0;
    return Math.max(5, Math.min(100, (chofer.total / maximo) * 100));
  }

  nombreSucursalSeleccionada(): string {
    return this.filtros.sucursal ? this.nombreSucursal(this.filtros.sucursal) : 'Todas las sucursales';
  }

  nombreSucursal(codigo: number): string {
    const sucursal = this.sucursales.find((item) => Number(item?.cod_sucursal) === Number(codigo));
    return sucursal?.nom_sucursal || (codigo ? `Sucursal ${codigo}` : 'Todas las sucursales');
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

  private db(): any {
    const client: any = this.supabase.client;
    return client?.schema ? client.schema(this.supabase.schema) : client;
  }

  private async fetchSalidas(): Promise<SalidaControlRow[]> {
    const rows = await this.fetchAllRows('salida', (query: any) => {
      let q = query
        .select('id,idsucursal,codsalida,fecsalida,codchofer,nomchofer')
        .gte('fecsalida', this.filtros.fechaInicio)
        .lte('fecsalida', this.filtros.fechaFin)
        .order('fecsalida', { ascending: false })
        .order('id', { ascending: false });

      if (this.filtros.sucursal) {
        q = q.eq('idsucursal', Number(this.filtros.sucursal));
      }

      return q;
    });

    return rows.map((row: any) => ({
      id: Number(row?.id || 0),
      idsucursal: Number(row?.idsucursal || 0),
      codsalida: String(row?.codsalida || '').trim(),
      fecsalida: String(row?.fecsalida || '').slice(0, 10),
      codchofer: this.toNumberOrNull(row?.codchofer),
      nomchofer: String(row?.nomchofer || '').trim() || null,
    })).filter((row: SalidaControlRow) => !!row.id);
  }

  private async fetchDetalles(idsSalida: number[]): Promise<DetSalidaRow[]> {
    const uniqueIds = Array.from(new Set(idsSalida.filter(Boolean)));
    if (!uniqueIds.length) return [];

    const chunks: number[][] = [];
    for (let i = 0; i < uniqueIds.length; i += 250) {
      chunks.push(uniqueIds.slice(i, i + 250));
    }

    const allRows: any[] = [];
    for (const chunk of chunks) {
      const rows = await this.fetchAllRows('detsalida', (query: any) =>
        query
          .select('idsalida,codsalida,codfact,valfact')
          .in('idsalida', chunk)
          .order('codfact', { ascending: true }),
      );
      allRows.push(...rows);
    }

    return allRows.map((row: any) => ({
      idsalida: Number(row?.idsalida || 0),
      codsalida: String(row?.codsalida || '').trim(),
      codfact: String(row?.codfact || '').trim(),
      valfact: Number(row?.valfact || 0) || 0,
    })).filter((row: DetSalidaRow) => !!row.idsalida);
  }

  private async fetchAllRows(table: string, buildQuery: (query: any) => any): Promise<any[]> {
    const db = this.db();
    const pageSize = 1000;
    const rows: any[] = [];

    for (let from = 0; ; from += pageSize) {
      const to = from + pageSize - 1;
      const { data, error } = await buildQuery(db.from(table)).range(from, to);
      if (error) throw error;

      const page = Array.isArray(data) ? data : [];
      rows.push(...page);

      if (page.length < pageSize) break;
    }

    return rows;
  }

  private agruparChoferes(salidas: SalidaControlRow[], detalles: DetSalidaRow[]): ResumenChofer[] {
    const salidaMap = new Map<number, SalidaControlRow>();
    salidas.forEach((salida) => salidaMap.set(salida.id, salida));

    const resumen = new Map<string, ResumenChofer>();
    const controlesPorChofer = new Map<string, Set<number>>();

    detalles.forEach((detalle) => {
      const salida = salidaMap.get(detalle.idsalida);
      if (!salida) return;

      const codigo = salida.codchofer !== null ? String(salida.codchofer) : 'S/C';
      const nombre = salida.nomchofer || 'Sin chofer';
      const key = `${codigo}|${nombre.toUpperCase()}`;
      const actual = resumen.get(key) || {
        codchofer: codigo,
        nomchofer: nombre,
        facturas: 0,
        total: 0,
        controles: 0,
        sucursales: [],
        ultimaSalida: salida.fecsalida,
      };

      actual.facturas += 1;
      actual.total += detalle.valfact;
      if (salida.idsucursal && !actual.sucursales.includes(salida.idsucursal)) {
        actual.sucursales.push(salida.idsucursal);
      }
      if (salida.fecsalida > actual.ultimaSalida) {
        actual.ultimaSalida = salida.fecsalida;
      }

      const controles = controlesPorChofer.get(key) || new Set<number>();
      controles.add(salida.id);
      controlesPorChofer.set(key, controles);

      resumen.set(key, actual);
    });

    const lista = Array.from(resumen.entries()).map(([key, chofer]) => ({
      ...chofer,
      controles: controlesPorChofer.get(key)?.size || 0,
      sucursales: chofer.sucursales.sort((a, b) => a - b),
    }));

    return lista.sort((a, b) => b.total - a.total);
  }

  private seleccionarSucursalInicial(): void {
    this.filtros.sucursal = this.sucursalPorDefecto();
  }

  private sucursalPorDefecto(): number {
    const sucursalUsuario = Number(localStorage.getItem('idSucursal') || 0);
    const existeSucursalUsuario = this.sucursales.some(
      (sucursal) => Number(sucursal?.cod_sucursal) === sucursalUsuario,
    );
    return sucursalUsuario > 0 && existeSucursalUsuario ? sucursalUsuario : 0;
  }

  private toNumberOrNull(value: any): number | null {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private fechaHoy(): string {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private inicioMes(): string {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}-01`;
  }
}
