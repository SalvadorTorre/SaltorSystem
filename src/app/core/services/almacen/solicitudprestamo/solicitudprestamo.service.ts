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

  private isJwtExpired(error: any): boolean {
    return String(error?.message || error?.error_description || error || '')
      .toLowerCase()
      .includes('jwt expired');
  }

  private async retryAfterExpiredJwt<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (!this.isJwtExpired(error)) throw error;
      this.supabase.clearAuthSession();
      return await operation();
    }
  }

  private toStringMax(value: any, max: number): string | null {
    const str = value === null || value === undefined ? '' : String(value).trim();
    return str ? str.slice(0, max) : null;
  }

  private toNumberOrNull(value: any): number | null {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
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

  private generarNumeroSolicitud(idsucursal: number, secuencia: number): string {
    const anio = new Date().getFullYear().toString();
    const sucStrFull = String(idsucursal);
    const sucStr = sucStrFull.length > 2 ? sucStrFull.slice(-2) : sucStrFull.padStart(2, '0');
    const seqStr = String(secuencia).padStart(5, '0');
    return `${anio}${sucStr}${seqStr}`;
  }

  private async getOrPickContFacturaRow(idsucursal: number): Promise<any | null> {
    const year = new Date().getFullYear();
    const { data, error } = await this.db
      .from('contfactura')
      .select('*')
      .order('id', { ascending: false })
      .limit(200);
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    return (
      rows.find((r: any) => this.toNumber(r?.idsucursal) === idsucursal && this.toNumber(r?.ano) === year) ||
      rows.find((r: any) => this.toNumber(r?.idsucursal) === idsucursal) ||
      rows.find((r: any) => !r?.idsucursal || this.toNumber(r?.idsucursal) === 0) ||
      rows[0] ||
      null
    );
  }

  private contfacturaIdField(row: any): string {
    if (row == null) return '';
    const candidates = ['id', 'cod', 'codigo', 'contid'];
    for (const c of candidates) {
      if (Object.prototype.hasOwnProperty.call(row, c) && (this.toNumberOrNull(row[c]) != null || typeof row[c] === 'string')) {
        return c;
      }
    }
    const numericKeys = Object.keys(row).filter((k) => this.toNumberOrNull(row[k]) != null);
    return numericKeys[0] || '';
  }

  private mapSolicitud(row: any): any {
    if (!row) return row;
    const codigo = row.so_codsoli ?? row.so_numero ?? row.numero ?? row.cod_solicitud ?? row.id ?? '';
    return {
      ...row,
      so_codsoli: codigo,
      so_numero: codigo,
      so_fecha: row.so_fecha ?? row.fecha ?? row.fec_solicitud ?? null,
      so_codclie: row.so_codclie ?? row.codclie ?? row.cod_cliente ?? '',
      so_nomclie: row.so_nomclie ?? row.nomclie ?? row.nombre_cliente ?? '',
      so_codsucuclie: row.so_codsucuclie ?? row.codsucuclie ?? null,
      so_sucursal_clie: row.so_sucursal_clie ?? row.sucursal_clie ?? '',
      so_nomvend: row.so_nomvend ?? row.so_solicitante ?? row.solicitante ?? '',
      so_solicitante: row.so_nomvend ?? row.so_solicitante ?? row.solicitante ?? '',
      so_observacion: row.so_observacion ?? row.observacion ?? '',
      so_status: row.so_status ?? row.status ?? row.ststus ?? 'A',
      so_codempr: row.so_codempr ?? row.codempr ?? null,
      so_codsucu: row.so_codsucu ?? row.codsucu ?? null,
    };
  }

  listar(
    pageIndex = 1,
    pageSize = 20,
    filtro = '',
    codEmpresa?: string,
    codSucursal?: number | string | null,
  ): Observable<any> {
    const offset = Math.max(pageIndex - 1, 0) * pageSize;
    return from(this.retryAfterExpiredJwt(async () => {
      let query = this.db
        .from('solicitud')
        .select('*', { count: 'exact' })
        .range(offset, offset + pageSize - 1);

      const empresa = String(codEmpresa || '').trim();
      const sucursal = Number(codSucursal);
      if (empresa) {
        query = query.eq('so_codempr', empresa);
      }
      if (Number.isFinite(sucursal) && sucursal > 0) {
        query = query.eq('so_codsucu', sucursal);
      }

      const q = String(filtro || '').trim();
      if (q) {
        query = query.or(`so_codsoli.ilike.%${q}%,so_nomclie.ilike.%${q}%,so_codclie.ilike.%${q}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data || [], total: Number(count || 0) };
    })).pipe(
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
    return from(this.retryAfterExpiredJwt(async () => {
      const [{ data: solicitud, error: solError }, { data: detalle, error: detError }] = await Promise.all([
        this.db.from('solicitud').select('*').eq('so_codsoli', soNumero).maybeSingle(),
        this.db.from('detsolicitud').select('*').eq('ds_codsoli', soNumero),
      ]);
      if (solError) throw solError;
      if (detError) throw detError;
      return solicitud ? { ...this.mapSolicitud(solicitud), detsolicitud: detalle || [] } : null;
    })).pipe(map((data: any) => ({ status: 'success', code: 200, data })));
  }

  listarParaVentaInterna(
    sucursalSeleccionadaId: number | string,
    sucursalLogueadaId: number | string,
    _clienteSucursalNombre: string,
    filtro = ''
  ): Observable<any> {
    const sucursalSeleccionada = Number(sucursalSeleccionadaId);
    const sucursalLogueada = Number(sucursalLogueadaId);
    const q = String(filtro || '').trim();

    return from(this.retryAfterExpiredJwt(async () => {
      if (
        !Number.isFinite(sucursalSeleccionada) || sucursalSeleccionada <= 0 ||
        !Number.isFinite(sucursalLogueada) || sucursalLogueada <= 0
      ) {
        return [];
      }

      let query = this.db
        .from('solicitud')
        .select('*')
        .eq('so_codsucuclie', sucursalLogueada)
        .eq('so_codsucu', sucursalSeleccionada)
        .order('so_fecha', { ascending: false })
        .limit(150);

      if (q) {
        query = query.or(`so_codsoli.ilike.%${q}%,so_nomclie.ilike.%${q}%,so_codclie.ilike.%${q}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row: any) => this.mapSolicitud(row));
    })).pipe(
      map((rows: any[]) => ({
        status: 'success',
        code: 200,
        data: rows,
        pagination: { total: rows.length, page: 1, pageSize: rows.length },
      }))
    );
  }

  guardar(solicitud: any, detalle: any[]): Observable<any> {
    return from(this.retryAfterExpiredJwt(async () => {
      const idsucursal = this.toNumber(
        solicitud?.so_codsucu ?? localStorage.getItem('idSucursal')
      );
      if (!idsucursal) throw new Error('Sucursal inválida para registrar la solicitud.');

      const contRow = await this.getOrPickContFacturaRow(idsucursal);
      if (!contRow) throw new Error(`No existe contfactura para la sucursal ${idsucursal}.`);

      const idField = this.contfacturaIdField(contRow);
      const contId = this.toNumberOrNull(contRow?.[idField]);
      if (!idField || contId == null) throw new Error('contfactura sin id.');

      const tieneCampo = Object.prototype.hasOwnProperty.call(contRow, 'contpedido');
      if (!tieneCampo) {
        throw new Error("El registro de contfactura no tiene el campo 'contpedido'. Agregue la columna para poder generar el numero de solicitud.");
      }

      const codProvided = this.toStringMax(solicitud?.so_codsoli ?? solicitud?.so_numero, 12);
      const contActual = this.toNumber(contRow?.contpedido ?? 0);
      const next = codProvided ? contActual : contActual + 1;
      const numero = codProvided ?? this.generarNumeroSolicitud(idsucursal, next);

      if (!codProvided) {
        const contUpdate: any = { contpedido: next };
        if (Object.prototype.hasOwnProperty.call(contRow, 'ano')) {
          contUpdate.ano = this.toNumber(contRow?.ano) || new Date().getFullYear();
        }
        const { error: contErr } = await this.db
          .from('contfactura')
          .update(contUpdate)
          .eq(idField, contId);
        if (contErr) throw new Error(`contfactura actualizar secuencia contpedido: ${String(contErr?.message || contErr)}`);
      }

      const header: any = {
        so_codsoli: numero,
        so_fecha: this.normalizeDate(solicitud?.so_fecha),
        so_codclie: this.toStringMax(solicitud?.so_codclie, 10),
        so_nomclie: this.toStringMax(solicitud?.so_nomclie, 80),
        so_codsucuclie: this.toNumber(solicitud?.so_codsucuclie) || null,
        so_sucursal_clie: this.toStringMax(solicitud?.so_sucursal_clie, 80),
        so_nomvend: this.toStringMax(solicitud?.so_nomvend ?? solicitud?.so_solicitante, 60),
        so_observacion: this.toStringMax(solicitud?.so_observacion ?? solicitud?.observacion, 255),
        so_status: this.toStringMax(solicitud?.so_status, 3) || 'A',
        so_codempr: this.toStringMax(solicitud?.so_codempr, 10),
        so_codsucu: idsucursal,
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
        ds_codsoli: numero,
        ds_codmerc: this.toStringMax(item?.ds_codmerc ?? item?.producto?.in_codmerc, 15) || '',
        ds_desmerc: this.toStringMax(item?.ds_desmerc ?? item?.producto?.in_desmerc, 80) || '',
        ds_canmerc: this.toNumber(item?.ds_canmerc ?? item?.cantidad),
        ds_unidad: this.toStringMax(item?.ds_unidad ?? item?.producto?.in_unidad ?? item?.unidad, 12),
      })).filter((item: any) => item.ds_codmerc && item.ds_canmerc > 0);

      if (rows.length) {
        const { error: detError } = await this.db.from('detsolicitud').insert(rows);
        if (detError) throw detError;
      }

      return { ...this.mapSolicitud(inserted), detsolicitud: rows };
    })).pipe(map((data: any) => ({ status: 'success', code: 200, data })));
  }
}
