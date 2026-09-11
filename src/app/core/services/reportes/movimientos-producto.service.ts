import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';

export interface MovimientoProductoRow {
  numdoc: string;
  fecha: string;
  codigo: string;
  producto: string;
  tipo: 'Entrada' | 'Salida';
  origen: string;
  cantidad: number;
  salida: number;
  entrada: number;
  cliente: string;
  balance: number;
  precio: number;
}

@Injectable({ providedIn: 'root' })
export class ServicioReporteMovProducto {
  constructor(private supabase: SupabaseService) {}

  private get db(): any {
    const client = this.supabase.client;
    if (!client) throw new Error('Supabase no esta configurado');
    const anyClient = client as any;
    return typeof anyClient.schema === 'function'
      ? anyClient.schema(this.supabase.schema)
      : anyClient;
  }

  buscarMovimientosPorProducto(codigo: string, desde?: string, hasta?: string, tipo?: string): Observable<any> {
    return from(this.buscar(codigo, desde, hasta, tipo));
  }

  private tenant(): { codempr: string; codsucu: number } {
    let empresa: any = null;
    try { empresa = JSON.parse(localStorage.getItem('empresa') || 'null'); } catch { empresa = null; }
    return {
      codempr: String(localStorage.getItem('codigoempresa') || localStorage.getItem('cod_empre') || empresa?.cod_empre || '').trim(),
      codsucu: Number(localStorage.getItem('idSucursal') || 0),
    };
  }

  private async buscar(codigoRaw: string, desde?: string, hasta?: string, tipoRaw?: string): Promise<any> {
    const codigo = String(codigoRaw || '').trim();
    if (!codigo) throw new Error('Seleccione un producto para consultar sus movimientos.');

    const { codempr, codsucu } = this.tenant();
    if (!codsucu) throw new Error('No se encontro la sucursal del usuario conectado.');
    const tipo = String(tipoRaw || '').trim().toLowerCase();
    const incluirEntradas = !tipo || tipo === 'entrada';
    const incluirSalidas = !tipo || tipo === 'salida';
    const consultas: Promise<any>[] = [];
    const fuentes: Array<'entrada' | 'factura' | 'interna'> = [];

    if (incluirEntradas) {
      let query = this.db.from('detentradamerc')
        .select('de_codentr,de_fecentr,de_codmerc,de_desmerc,de_canentr,de_premerc,de_codsupl')
        .eq('de_codmerc', codigo).eq('de_codsucu', codsucu).order('de_fecentr', { ascending: true });
      if (codempr) query = query.eq('de_codempr', codempr);
      if (desde) query = query.gte('de_fecentr', desde);
      if (hasta) query = query.lte('de_fecentr', hasta);
      consultas.push(query); fuentes.push('entrada');
    }

    if (incluirSalidas) {
      let facturas = this.db.from('detfactura')
        .select('df_codfact,df_fecfact,df_codmerc,df_desmerc,df_canmerc,df_premerc,df_nomclie,df_status')
        .eq('df_codmerc', codigo).eq('df_codsucu', String(codsucu)).neq('df_status', 'N')
        .order('df_fecfact', { ascending: true });
      if (codempr) facturas = facturas.eq('df_codepr', codempr);
      if (desde) facturas = facturas.gte('df_fecfact', desde);
      if (hasta) facturas = facturas.lte('df_fecfact', hasta);
      consultas.push(facturas); fuentes.push('factura');

      let internas = this.db.from('detventainterna')
        .select('df_codfact,df_fecfact,df_codmerc,df_desmerc,df_canmerc,df_premerc,df_nomclie,df_status')
        .eq('df_codmerc', codigo).eq('df_codsucu', codsucu).neq('df_status', 'N')
        .order('df_fecfact', { ascending: true });
      if (codempr) internas = internas.eq('df_codempr', codempr);
      if (desde) internas = internas.gte('df_fecfact', desde);
      if (hasta) internas = internas.lte('df_fecfact', hasta);
      consultas.push(internas); fuentes.push('interna');
    }

    consultas.push(this.db.from('inventario').select('inv_existencia')
      .eq('inv_codprod', codigo).eq('inv_codsucu', codsucu).limit(1).maybeSingle());
    const respuestas = await Promise.all(consultas);
    const inventarioResp = respuestas.pop();
    if (inventarioResp?.error) throw inventarioResp.error;

    const rows: MovimientoProductoRow[] = [];
    respuestas.forEach((resp: any, index: number) => {
      if (resp?.error) throw resp.error;
      const fuente = fuentes[index];
      for (const item of resp?.data || []) {
        if (fuente === 'entrada') {
          const cantidad = this.numero(item.de_canentr);
          rows.push({ numdoc: String(item.de_codentr || ''), fecha: item.de_fecentr || '', codigo: String(item.de_codmerc || codigo),
            producto: item.de_desmerc || '', tipo: 'Entrada', origen: 'Entrada de mercancia', cantidad, salida: 0, entrada: cantidad,
            cliente: item.de_codsupl ? `Suplidor ${item.de_codsupl}` : '', balance: 0, precio: this.numero(item.de_premerc) });
        } else {
          const cantidad = this.numero(item.df_canmerc);
          rows.push({ numdoc: String(item.df_codfact || ''), fecha: item.df_fecfact || '', codigo: String(item.df_codmerc || codigo),
            producto: item.df_desmerc || '', tipo: 'Salida', origen: fuente === 'interna' ? 'Venta interna' : 'Factura', cantidad,
            salida: cantidad, entrada: 0, cliente: String(item.df_nomclie || ''), balance: 0, precio: this.numero(item.df_premerc) });
        }
      }
    });

    rows.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.numdoc.localeCompare(b.numdoc) || a.tipo.localeCompare(b.tipo));
    const existenciaActual = this.numero(inventarioResp?.data?.inv_existencia);
    const movimientoNeto = rows.reduce((total, row) => total + row.entrada - row.salida, 0);
    let balance = existenciaActual - movimientoNeto;
    rows.forEach(row => { balance += row.entrada - row.salida; row.balance = balance; });
    return { data: { rows, existenciaActual } };
  }

  private numero(value: any): number {
    const numero = Number(value);
    return Number.isFinite(numero) ? numero : 0;
  }
}
