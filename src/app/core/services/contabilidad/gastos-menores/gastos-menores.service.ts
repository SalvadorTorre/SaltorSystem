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
  lineas: Array<{
    descripcion: string;
    cantidad: number;
    precio: number;
    monto: number;
  }>;
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
}
