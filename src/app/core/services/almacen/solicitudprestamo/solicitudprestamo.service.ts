import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable({
  providedIn: 'root',
})
export class SolicitudPrestamoService {
  constructor(private supabase: SupabaseService) {}

  private get db(): any {
    const client = this.supabase.client;
    if (!client) {
      throw new Error('Supabase no está configurado');
    }
    const anyClient = client as any;
    if (typeof anyClient?.schema === 'function') {
      try {
        return anyClient.schema(this.supabase.schema);
      } catch {
        return anyClient;
      }
    }
    return anyClient;
  }

  private toStringMax(value: any, max: number): string | null {
    const str = value === null || value === undefined ? '' : String(value).trim();
    return str ? str.slice(0, max) : null;
  }

  private toNumber(value: any): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  private normalizeDate(value: any): string {
    if (!value) return new Date().toISOString().slice(0, 10);
    const raw = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const dmY = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dmY) return `${dmY[3]}-${dmY[2]}-${dmY[1]}`;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
  }

  private generarNumero(): string {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const tail = String(Date.now()).slice(-6);
    return `SP${yy}${mm}${dd}${tail}`;
  }

  private mapSolicitud(row: any): any {
    if (!row) return row;
    return {
      ...row,
      so_numero: row.so_numero ?? row.numero ?? row.cod_solicitud ?? row.id ?? '',
      so_fecha: row.so_fecha ?? row.fecha ?? row.fec_solicitud ?? null,
      so_codclie: row.so_codclie ?? row.codclie ?? row.cod_cliente ?? '',
      so_nomclie: row.so_nomclie ?? row.nomclie ?? row.nombre_cliente ?? '',
      so_sucursal_clie: row.so_sucursal_clie ?? row.sucursal_clie ?? '',
      so_solicitante: row.so_solicitante ?? row.solicitante ?? '',
      so_observacion: row.so_observacion ?? row.observacion ?? '',
      so_status: row.so_status ?? row.status ?? 'A',
      so_codempr: row.so_codempr ?? row.codempr ?? null,
      so_codsucu: row.so_codsucu ?? row.codsucu ?? null,
    };
  }

  listar(pageIndex = 1, pageSize = 20, filtro = ''): Observable<any> {
    const offset = Math.max(pageIndex - 1, 0) * pageSize;
    return from((async () => {
      let query = this.db
        .from('solicitud')
        .select('*', { count: 'exact' })
        .range(offset, offset + pageSize - 1);

      const q = String(filtro || '').trim();
      if (q) {
        query = query.or(`so_numero.ilike.%${q}%,so_nomclie.ilike.%${q}%,so_codclie.ilike.%${q}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data || [], total: Number(count || 0) };
    })()).pipe(
      map((result: any) => ({
        status: 'success',
        code: 200,
        data: result.rows.map((row: any) => this.mapSolicitud(row)),
        pagination: { total: result.total, page: pageIndex, pageSize },
      }))
    );
  }

  buscar(numero: string): Observable<any> {
    const soNumero = String(numero || '').trim();
    return from((async () => {
      const [{ data: solicitud, error: solError }, { data: detalle, error: detError }] = await Promise.all([
        this.db.from('solicitud').select('*').eq('so_numero', soNumero).maybeSingle(),
        this.db.from('detsolicitud').select('*').eq('ds_numero', soNumero),
      ]);
      if (solError) throw solError;
      if (detError) throw detError;
      return solicitud ? { ...this.mapSolicitud(solicitud), detsolicitud: detalle || [] } : null;
    })()).pipe(map((data: any) => ({ status: 'success', code: 200, data })));
  }

  guardar(solicitud: any, detalle: any[]): Observable<any> {
    return from((async () => {
      const numero = this.toStringMax(solicitud?.so_numero, 12) || this.generarNumero();
      const header: any = {
        so_numero: numero,
        so_fecha: this.normalizeDate(solicitud?.so_fecha),
        so_codclie: this.toStringMax(solicitud?.so_codclie, 10),
        so_nomclie: this.toStringMax(solicitud?.so_nomclie, 80),
        so_sucursal_clie: this.toStringMax(solicitud?.so_sucursal_clie, 80),
        so_solicitante: this.toStringMax(solicitud?.so_solicitante, 60),
        so_observacion: this.toStringMax(solicitud?.so_observacion, 250),
        so_status: this.toStringMax(solicitud?.so_status || 'A', 4),
        so_codempr: this.toStringMax(solicitud?.so_codempr, 10),
        so_codsucu: this.toNumber(solicitud?.so_codsucu) || null,
      };
      Object.keys(header).forEach((key) => {
        if (header[key] === null || header[key] === undefined || header[key] === '') delete header[key];
      });

      const { data: inserted, error: solError } = await this.db
        .from('solicitud')
        .insert(header)
        .select('*')
        .single();
      if (solError) throw solError;

      const rows = (detalle || []).map((item: any) => ({
        ds_numero: numero,
        ds_codmerc: this.toStringMax(item?.ds_codmerc, 15) || '',
        ds_desmerc: this.toStringMax(item?.ds_desmerc, 80) || '',
        ds_canmerc: this.toNumber(item?.ds_canmerc),
        ds_unidad: this.toStringMax(item?.ds_unidad, 12),
      })).filter((item: any) => item.ds_codmerc && item.ds_canmerc > 0);

      if (rows.length) {
        const { error: detError } = await this.db.from('detsolicitud').insert(rows);
        if (detError) throw detError;
      }

      return { ...this.mapSolicitud(inserted), detsolicitud: rows };
    })()).pipe(map((data: any) => ({ status: 'success', code: 200, data })));
  }
}
