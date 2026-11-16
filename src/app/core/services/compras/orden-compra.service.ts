import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';

export interface OrdenCompraDetalle {
  linea?: number;
  codproducto: string;
  descripcion: string;
  cantidad: number;
  costo: number;
  porc_itbis: number;
  itbis?: number;
  total?: number;
}

export interface OrdenCompra {
  codorden?: string | null;
  fecorden: string;
  valorden?: number;
  subtotal?: number;
  itbis?: number;
  codsuplidor?: number | null;
  nomsuplidor: string;
  rncsuplidor?: string | null;
  condicionpago?: string | null;
  observacion?: string | null;
  codempresa?: string | null;
  codsucursal?: number | null;
  status?: string;
  estadocxp?: string;
  codusuario?: number | null;
}

/** Compras > Orden de compra (tablas ordencompra y ordendetalle). */
@Injectable({ providedIn: 'root' })
export class ServicioOrdenCompra {
  constructor(private readonly supabase: SupabaseService) {}

  private get db(): any {
    const client = this.supabase.client as any;
    if (!client) throw new Error('Supabase no está configurado');
    if (typeof client.schema === 'function') {
      try {
        return client.schema(this.supabase.schema);
      } catch {
        return client;
      }
    }
    return client;
  }

  private error(err: any): Error {
    const code = String(err?.code || '');
    if (code === 'PGRST202' || code === '42P01' || code === 'PGRST205') {
      return new Error('Falta ejecutar en Supabase la migración 20261111170000_orden_compra.sql.');
    }
    return new Error(String(err?.message || err || 'Error en orden de compra'));
  }

  /**
   * Crea (sin codorden) o edita (con codorden) la orden con su detalle.
   * La empresa y la sucursal son las elegidas en la orden.
   */
  guardar(orden: OrdenCompra, detalles: OrdenCompraDetalle[]): Observable<any> {
    return from((async () => {
      if (!String(orden.codempresa || '').trim() || !Number(orden.codsucursal)) {
        throw new Error('Seleccione la empresa y la sucursal de la orden.');
      }
      const { data, error } = await this.db.rpc('guardar_orden_compra', {
        p_orden: {
          ...orden,
          codempresa: String(orden.codempresa).trim(),
          codsucursal: Number(orden.codsucursal),
        },
        p_detalles: detalles.map((d) => ({
          codproducto: d.codproducto,
          descripcion: d.descripcion,
          cantidad: Number(d.cantidad) || 0,
          costo: Number(d.costo) || 0,
          porc_itbis: Number(d.porc_itbis) || 0,
        })),
      });
      if (error) throw this.error(error);
      return data;
    })());
  }

  anular(codorden: string): Observable<any> {
    return from((async () => {
      const { data, error } = await this.db.rpc('anular_orden_compra', { p_codorden: codorden });
      if (error) throw this.error(error);
      return data;
    })());
  }

  /** Ordenes de todas las empresas; empresa y sucursal son filtros opcionales. */
  listar(filtros: {
    desde?: string;
    hasta?: string;
    texto?: string;
    status?: string;
    empresa?: string;
    sucursal?: number | string | null;
  }): Observable<OrdenCompra[]> {
    return from((async () => {
      let q = this.db
        .from('ordencompra')
        .select('*')
        .order('fecorden', { ascending: false })
        .order('codorden', { ascending: false })
        .limit(500);
      if (filtros.desde) q = q.gte('fecorden', filtros.desde);
      if (filtros.hasta) q = q.lte('fecorden', filtros.hasta);
      if (filtros.status) q = q.eq('status', filtros.status);
      if (filtros.empresa) q = q.eq('codempresa', filtros.empresa);
      if (Number(filtros.sucursal) > 0) q = q.eq('codsucursal', Number(filtros.sucursal));
      const texto = String(filtros.texto || '').trim().replace(/[,()%]/g, '');
      if (texto) {
        q = q.or(`codorden.ilike.%${texto}%,nomsuplidor.ilike.%${texto}%,rncsuplidor.ilike.%${texto}%`);
      }
      const { data, error } = await q;
      if (error) throw this.error(error);
      return (data || []) as OrdenCompra[];
    })());
  }

  obtener(codorden: string): Observable<{ orden: OrdenCompra; detalles: OrdenCompraDetalle[] } | null> {
    return from((async () => {
      const [{ data: orden, error: e1 }, { data: detalles, error: e2 }] = await Promise.all([
        this.db.from('ordencompra').select('*').eq('codorden', codorden).maybeSingle(),
        this.db.from('ordendetalle').select('*').eq('codorden', codorden).order('linea', { ascending: true }),
      ]);
      if (e1) throw this.error(e1);
      if (e2) throw this.error(e2);
      if (!orden) return null;
      return { orden, detalles: (detalles || []) as OrdenCompraDetalle[] };
    })());
  }

  /**
   * Productos del catalogo (productos2). Por codigo: los que empiezan con lo
   * escrito, ordenados por codigo. Por descripcion: los que empiezan con lo
   * escrito, ordenados por descripcion. Si no hay coincidencias, la
   * descripcion puede ser un texto libre (ej. "Reparacion de gomas").
   */
  buscarProductos(campo: 'codigo' | 'descripcion', texto: string): Observable<any[]> {
    return from((async () => {
      const t = String(texto || '').trim().replace(/[,()%]/g, '');
      if (!t) return [];
      const columna = campo === 'codigo' ? 'in_codmerc' : 'in_desmerc';
      const consultar = async (patron: string) => {
        const { data, error } = await this.db
          .from('productos2')
          .select('in_codmerc,in_desmerc,in_costmer,in_premerc')
          .ilike(columna, patron)
          .order(columna, { ascending: true })
          .limit(30);
        if (error) throw this.error(error);
        return data || [];
      };
      const filas = await consultar(`${t}%`);
      return filas.map((p: any) => ({
        ...p,
        in_codmerc: String(p?.in_codmerc ?? '').trim(),
        in_desmerc: String(p?.in_desmerc ?? '').trim(),
        in_cosmerc: Number(p?.in_costmer ?? 0) || 0,
      }));
    })());
  }

  /** Producto de productos2 con ese codigo exacto (sin distinguir mayusculas), o null. */
  buscarProductoPorCodigo(codigo: string): Observable<any | null> {
    return from((async () => {
      const c = String(codigo || '').trim().replace(/[,()%_]/g, '');
      if (!c) return null;
      const { data, error } = await this.db
        .from('productos2')
        .select('in_codmerc,in_desmerc,in_costmer,in_premerc')
        .ilike('in_codmerc', c)
        .limit(1);
      if (error) throw this.error(error);
      const p = (data || [])[0];
      if (!p) return null;
      return {
        ...p,
        in_codmerc: String(p?.in_codmerc ?? '').trim(),
        in_desmerc: String(p?.in_desmerc ?? '').trim(),
        in_cosmerc: Number(p?.in_costmer ?? 0) || 0,
      };
    })());
  }

  /**
   * Suplidores por nombre mientras se escribe: primero los que empiezan con
   * el texto y luego los que lo contienen (RPC buscar_suplidores, con indice).
   */
  buscarSuplidores(texto: string): Observable<any[]> {
    return from((async () => {
      const t = String(texto || '').trim().replace(/[,()%]/g, '');
      if (!t) return [];

      const rpc = await this.db.rpc('buscar_suplidores', { p_texto: t, p_limite: 15 });
      if (!rpc.error) return rpc.data || [];
      if (String(rpc.error?.code || '') !== 'PGRST202') throw this.error(rpc.error);

      // Sin la migracion 20261111190000: consulta directa (mas lenta).
      let q = this.db
        .from('suplidor')
        .select('su_codsupl,su_nomsupl,su_rncsupl,su_telsupl')
        .order('su_nomsupl', { ascending: true })
        .limit(15);
      q = /^\d+$/.test(t)
        ? q.or(`su_codsupl.eq.${t},su_rncsupl.ilike.%${t}%`)
        : q.or(`su_nomsupl.ilike.%${t}%,su_rncsupl.ilike.%${t}%`);
      const { data, error } = await q;
      if (error) throw this.error(error);
      return data || [];
    })());
  }
}
