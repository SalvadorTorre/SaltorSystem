import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from '../../supabase/supabase.service';

export interface GastoMenorGuardarPayload {
  numero: string;
  encf?: string;
  fecha: string;
  fechaVencimiento?: string;
  total: number;
  estadoDgii: string;
  trackId?: string;
  requestJson?: any;
  responseJson?: any;
  categoria?: string;
  formaPago?: string;
  proveedorNombre?: string;
  proveedorRnc?: string;
  ncfProveedor?: string;
  comentario?: string;
  anulado?: boolean;
  lineas: Array<{
    descripcion: string;
    cantidad: number;
    precio: number;
    monto: number;
  }>;
}

export interface GastoMenorFiltros {
  fechaDesde?: string;
  fechaHasta?: string;
  estado?: string;
  categoria?: string;
  texto?: string;
  soloAnulados?: boolean;
}

@Injectable({ providedIn: 'root' })
export class GastosMenoresService {
  constructor(private supabase: SupabaseService) {}

  private get db(): any {
    const client = this.supabase.client;
    if (!client) throw new Error('Supabase no esta configurado.');
    const anyClient = client as any;
    return typeof anyClient.schema === 'function'
      ? anyClient.schema(this.supabase.schema)
      : anyClient;
  }

  private tenant(): { empresa: string; sucursal: number; usuario: string } {
    let empresaObj: any = null;
    try {
      empresaObj = JSON.parse(localStorage.getItem('empresa') || 'null');
    } catch {
      empresaObj = null;
    }
    return {
      empresa: String(
        localStorage.getItem('codigoempresa') ||
        localStorage.getItem('cod_empre') ||
        empresaObj?.cod_empre ||
        '',
      ).trim(),
      sucursal: Number(localStorage.getItem('idSucursal') || 0),
      usuario: String(
        localStorage.getItem('nombreusuario') ||
        localStorage.getItem('usuario') ||
        localStorage.getItem('user') ||
        '',
      ).trim(),
    };
  }

  guardar(payload: GastoMenorGuardarPayload): Observable<any> {
    return from((async () => {
      const tenant = this.tenant();
      if (!tenant.empresa || !tenant.sucursal) {
        throw new Error('No se encontro la empresa o sucursal del usuario logiado.');
      }

      const header = {
        gm_numero: String(payload.numero || '').trim(),
        gm_encf: String(payload.encf || '').trim() || null,
        gm_fecha: payload.fecha,
        gm_fecha_vencimiento: payload.fechaVencimiento || null,
        gm_total: Number(payload.total || 0),
        gm_estado_dgii: String(payload.estadoDgii || 'BORRADOR').trim(),
        gm_track_id: String(payload.trackId || '').trim() || null,
        gm_request_json: payload.requestJson ?? null,
        gm_response_json: payload.responseJson ?? null,
        gm_categoria: String(payload.categoria || '').trim() || null,
        gm_forma_pago: String(payload.formaPago || '').trim() || null,
        gm_proveedor_nombre: String(payload.proveedorNombre || '').trim() || null,
        gm_proveedor_rnc: String(payload.proveedorRnc || '').trim() || null,
        gm_ncf_proveedor: String(payload.ncfProveedor || '').trim() || null,
        gm_comentario: String(payload.comentario || '').trim() || null,
        gm_anulado: Boolean(payload.anulado),
        gm_codempr: tenant.empresa,
        gm_codsucu: tenant.sucursal,
        gm_usuario: tenant.usuario || null,
        updated_at: new Date().toISOString(),
      };

      const { error: headerError } = await this.db
        .from('gasto_menor')
        .upsert(header, { onConflict: 'gm_numero' });
      if (headerError) throw headerError;

      const { error: deleteError } = await this.db
        .from('det_gasto_menor')
        .delete()
        .eq('gm_numero', header.gm_numero);
      if (deleteError) throw deleteError;

      const lineas = (payload.lineas || []).map((linea, index) => ({
        gm_numero: header.gm_numero,
        linea: index + 1,
        descripcion: String(linea.descripcion || '').trim(),
        cantidad: Number(linea.cantidad || 0),
        precio: Number(linea.precio || 0),
        monto: Number(linea.monto || 0),
      }));
      if (lineas.length) {
        const { error: linesError } = await this.db
          .from('det_gasto_menor')
          .insert(lineas);
        if (linesError) throw linesError;
      }

      return { ...header, lineas };
    })()).pipe(map((data) => ({ status: 'success', code: 200, data })));
  }

  listar(limit = 300): Observable<any> {
    return from((async () => {
      const tenant = this.tenant();
      if (!tenant.empresa || !tenant.sucursal) {
        throw new Error('No se encontro la empresa o sucursal del usuario logiado.');
      }
      const { data, error } = await this.db
        .from('gasto_menor')
        .select('gm_numero,gm_encf,gm_fecha,gm_total,gm_estado_dgii,gm_track_id,gm_request_json,gm_response_json,gm_usuario,created_at,updated_at')
        .eq('gm_codempr', tenant.empresa)
        .eq('gm_codsucu', tenant.sucursal)
        .order('gm_fecha', { ascending: false })
        .order('gm_numero', { ascending: false })
        .limit(Math.max(1, Math.min(Number(limit) || 300, 1000)));
      if (error) throw error;
      return data || [];
    })()).pipe(map((data) => ({ status: 'success', code: 200, data })));
  }

  actualizarResultado(
    numero: string,
    data: { encf?: string; estado: string; trackId?: string; requestJson?: any; responseJson?: any },
  ): Observable<any> {
    return from((async () => {
      const tenant = this.tenant();
      let query = this.db
        .from('gasto_menor')
        .update({
          gm_encf: String(data.encf || '').trim() || null,
          gm_estado_dgii: String(data.estado || '').trim(),
          gm_track_id: String(data.trackId || '').trim() || null,
          gm_request_json: data.requestJson ?? null,
          gm_response_json: data.responseJson ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('gm_numero', String(numero || '').trim())
        .eq('gm_codempr', tenant.empresa)
        .eq('gm_codsucu', tenant.sucursal)
        .select('gm_numero,gm_estado_dgii,gm_track_id')
        .maybeSingle();
      const { data: updated, error } = await query;
      if (error) throw error;
      if (!updated) throw new Error(`No se encontro el gasto menor ${numero} para actualizar.`);
      return updated;
    })()).pipe(map((data) => ({ status: 'success', code: 200, data })));
  }

  obtenerUno(numero: string): Observable<any> {
    return from((async () => {
      const tenant = this.tenant();
      if (!tenant.empresa || !tenant.sucursal) {
        throw new Error('No se encontro la empresa o sucursal del usuario logiado.');
      }
      const { data, error } = await this.db
        .from('gasto_menor')
        .select(`
          gm_numero,gm_encf,gm_fecha,gm_fecha_vencimiento,gm_total,gm_estado_dgii,gm_track_id,
          gm_categoria,gm_forma_pago,gm_proveedor_nombre,gm_proveedor_rnc,gm_ncf_proveedor,gm_comentario,
          gm_anulado,gm_usuario,created_at,updated_at,
          det_gasto_menor(linea,descripcion,cantidad,precio,monto)
        `)
        .eq('gm_numero', String(numero || '').trim())
        .eq('gm_codempr', tenant.empresa)
        .eq('gm_codsucu', tenant.sucursal)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    })()).pipe(map((data) => ({ status: 'success', code: 200, data })));
  }

  anular(numero: string, motivo?: string): Observable<any> {
    return from((async () => {
      const tenant = this.tenant();
      if (!tenant.empresa || !tenant.sucursal) {
        throw new Error('No se encontro la empresa o sucursal del usuario logiado.');
      }
      const comentarioActual = motivo
        ? `ANULADO por: ${motivo}. ${new Date().toLocaleString()}`
        : `ANULADO ${new Date().toLocaleString()}`;
      const { data, error } = await this.db
        .from('gasto_menor')
        .update({
          gm_anulado: true,
          gm_estado_dgii: 'ANULADO',
          gm_comentario: comentarioActual,
          updated_at: new Date().toISOString(),
        })
        .eq('gm_numero', String(numero || '').trim())
        .eq('gm_codempr', tenant.empresa)
        .eq('gm_codsucu', tenant.sucursal)
        .select('gm_numero,gm_anulado,gm_estado_dgii')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error(`No se encontro el gasto menor ${numero} para anular.`);
      return data;
    })()).pipe(map((data) => ({ status: 'success', code: 200, data })));
  }

  listarFiltrado(filtros: GastoMenorFiltros, limit = 1000): Observable<any> {
    return from((async () => {
      const tenant = this.tenant();
      if (!tenant.empresa || !tenant.sucursal) {
        throw new Error('No se encontro la empresa o sucursal del usuario logiado.');
      }
      let query = this.db
        .from('gasto_menor')
        .select(`
          gm_numero,gm_encf,gm_fecha,gm_total,gm_estado_dgii,gm_track_id,
          gm_categoria,gm_forma_pago,gm_proveedor_nombre,gm_proveedor_rnc,gm_ncf_proveedor,
          gm_anulado,gm_usuario,created_at,updated_at
        `)
        .eq('gm_codempr', tenant.empresa)
        .eq('gm_codsucu', tenant.sucursal);

      if (filtros?.fechaDesde) query = query.gte('gm_fecha', filtros.fechaDesde);
      if (filtros?.fechaHasta) query = query.lte('gm_fecha', filtros.fechaHasta);
      if (filtros?.estado) query = query.eq('gm_estado_dgii', filtros.estado);
      if (filtros?.categoria) query = query.eq('gm_categoria', filtros.categoria);
      if (filtros?.soloAnulados) query = query.eq('gm_anulado', true);

      query = query
        .order('gm_fecha', { ascending: false })
        .order('gm_numero', { ascending: false })
        .limit(Math.max(1, Math.min(Number(limit) || 1000, 5000)));

      const { data, error } = await query;
      if (error) throw error;
      const result = Array.isArray(data) ? data : [];
      if (filtros?.texto) {
        const txt = String(filtros.texto).trim().toLowerCase();
        return result.filter((g) => [
          g?.gm_numero, g?.gm_encf, g?.gm_estado_dgii, g?.gm_track_id, g?.gm_usuario,
          g?.gm_categoria, g?.gm_forma_pago, g?.gm_proveedor_nombre, g?.gm_proveedor_rnc, g?.gm_ncf_proveedor,
        ].some((v) => String(v || '').toLowerCase().includes(txt)));
      }
      return result;
    })()).pipe(map((data) => ({ status: 'success', code: 200, data })));
  }

  resumen(fechaDesde?: string, fechaHasta?: string): Observable<any> {
    return from((async () => {
      const tenant = this.tenant();
      if (!tenant.empresa || !tenant.sucursal) {
        throw new Error('No se encontro la empresa o sucursal del usuario logiado.');
      }
      let query = this.db
        .from('gasto_menor')
        .select('gm_total,gm_categoria,gm_forma_pago,gm_estado_dgii,gm_anulado,gm_fecha')
        .eq('gm_codempr', tenant.empresa)
        .eq('gm_codsucu', tenant.sucursal)
        .eq('gm_anulado', false);
      if (fechaDesde) query = query.gte('gm_fecha', fechaDesde);
      if (fechaHasta) query = query.lte('gm_fecha', fechaHasta);
      const { data, error } = await query;
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      const totalRegistros = rows.length;
      const totalMonto = rows.reduce((acc, r) => acc + Number(r.gm_total || 0), 0);
      const porCategoria = new Map<string, { monto: number; count: number }>();
      const porFormaPago = new Map<string, { monto: number; count: number }>();
      const porEstado = new Map<string, number>();
      rows.forEach((r) => {
        const cat = String(r.gm_categoria || 'Sin categoría');
        const fp = String(r.gm_forma_pago || 'Sin forma pago');
        const est = String(r.gm_estado_dgii || 'SIN ESTADO');
        const m = Number(r.gm_total || 0);
        const prevCat = porCategoria.get(cat) || { monto: 0, count: 0 };
        porCategoria.set(cat, { monto: prevCat.monto + m, count: prevCat.count + 1 });
        const prevFp = porFormaPago.get(fp) || { monto: 0, count: 0 };
        porFormaPago.set(fp, { monto: prevFp.monto + m, count: prevFp.count + 1 });
        porEstado.set(est, (porEstado.get(est) || 0) + 1);
      });
      return {
        totalRegistros,
        totalMonto,
        porCategoria: Object.fromEntries(porCategoria),
        porFormaPago: Object.fromEntries(porFormaPago),
        porEstado: Object.fromEntries(porEstado),
      };
    })()).pipe(map((data) => ({ status: 'success', code: 200, data })));
  }
}
