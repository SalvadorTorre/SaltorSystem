import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpInvokeService } from '../../http-invoke.service';
import { SupabaseService } from '../../supabase/supabase.service';

export interface ReciboData {
  id?: number;
  fecha: string | Date; // Backend expects Date or string compatible with Date
  cantidad: number;
  nombre: string;
  concepto: string;
  fpago: number;
  usuario?: string;
  codusuario?: string;
  nombreusuario?: string;
  codsucu?: number;
}

export interface ReciboResponse {
  status: string;
  code: number;
  message: string;
  data: ReciboData | ReciboData[];
}

@Injectable({
  providedIn: 'root'
})
export class ServicioRecibo {
  private readonly tableName = 'recibo';

  constructor(
    private http: HttpInvokeService,
    private supabase: SupabaseService
  ) { }

  private get useSupabase(): boolean {
    return Boolean(this.supabase?.enabled && this.supabase?.client);
  }

  private get db(): any {
    const client = this.supabase.client;
    if (!client) {
      throw new Error('Supabase no esta configurado');
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

  private toNumber(value: any): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  private usuarioActual(): string {
    return String(
      localStorage.getItem('idusuario') ||
      localStorage.getItem('codigousuario') ||
      localStorage.getItem('username') ||
      '',
    ).trim();
  }

  private codigoUsuarioActual(): string {
    return String(
      localStorage.getItem('codigousuario') ||
      localStorage.getItem('idusuario') ||
      '',
    ).trim();
  }

  private nombreUsuarioActual(): string {
    return String(localStorage.getItem('username') || '').trim();
  }

  private sucursalActual(): number {
    const value = Number(localStorage.getItem('idSucursal') || 0);
    return Number.isFinite(value) ? value : 0;
  }

  private faltaColumnaUsuario(error: any): boolean {
    const texto = String(error?.message || error?.details || '').toLowerCase();
    return (
      error?.code === '42703' ||
      error?.code === 'PGRST204' ||
      ((texto.includes('usuario') || texto.includes('codsucu')) &&
        (texto.includes('column') || texto.includes('schema cache')))
    );
  }

  private normalizeDate(value: string | Date | null | undefined): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    const text = String(value ?? '').trim();
    if (!text) {
      return new Date().toISOString();
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return `${text}T00:00:00`;
    }
    return text;
  }

  private mapRow(row: any): ReciboData {
    return {
      id: row?.id !== undefined && row?.id !== null ? Number(row.id) : undefined,
      fecha: row?.fecha ?? '',
      cantidad: this.toNumber(row?.cantidad),
      nombre: String(row?.nombre ?? '').trim(),
      concepto: String(row?.concepto ?? '').trim(),
      fpago: this.toNumber(row?.fpago),
      usuario: String(row?.usuario ?? '').trim(),
      codusuario: String(row?.codusuario ?? '').trim(),
      nombreusuario: String(row?.nombreusuario ?? '').trim(),
      codsucu: this.toNumber(row?.codsucu),
    };
  }

  private mapToDb(data: ReciboData): any {
    return {
      fecha: this.normalizeDate(data?.fecha),
      cantidad: this.toNumber(data?.cantidad),
      nombre: String(data?.nombre ?? '').trim(),
      concepto: String(data?.concepto ?? '').trim(),
      fpago: this.toNumber(data?.fpago),
      usuario: this.usuarioActual(),
      codusuario: this.codigoUsuarioActual(),
      nombreusuario: this.nombreUsuarioActual(),
      codsucu: this.sucursalActual(),
    };
  }

  crearRecibo(data: ReciboData): Observable<ReciboResponse> {
    if (this.useSupabase) {
      const payload = this.mapToDb(data);
      return from((async () => {
        let { data: row, error } = await this.db
          .from(this.tableName)
          .insert(payload)
          .select('*')
          .single();
        if (error && this.faltaColumnaUsuario(error)) {
          const payloadLegado = { ...payload };
          delete payloadLegado.usuario;
          delete payloadLegado.codusuario;
          delete payloadLegado.nombreusuario;
          delete payloadLegado.codsucu;
          const fallback = await this.db
            .from(this.tableName)
            .insert(payloadLegado)
            .select('*')
            .single();
          row = fallback.data;
          error = fallback.error;
        }
        if (error) throw error;
        return row;
      })()).pipe(
        map((row: any) => ({
          status: 'success',
          code: 200,
          message: 'Recibo guardado',
          data: this.mapRow(row)
        }))
      );
    }
    return this.http.PostRequest<ReciboResponse, ReciboData>('/recibos', data);
  }

  obtenerRecibos(): Observable<ReciboResponse> {
    if (this.useSupabase) {
      return from((async () => {
        const usuario = this.usuarioActual();
        if (!usuario) throw new Error('No se encontro el usuario conectado.');
        let { data, error } = await this.db
          .from(this.tableName)
          .select('*')
          .eq('usuario', usuario)
          .order('id', { ascending: false })
          .limit(200);
        if (error && this.faltaColumnaUsuario(error)) {
          const fallback = await this.db
            .from(this.tableName)
            .select('*')
            .order('id', { ascending: false })
            .limit(200);
          data = fallback.data;
          error = fallback.error;
          console.warn('[ServicioRecibo] Falta ejecutar migrate_recibo_usuario.sql; se usa compatibilidad temporal.');
        }
        if (error) throw error;
        return data || [];
      })()).pipe(
        map((rows: any[]) => ({
          status: 'success',
          code: 200,
          message: 'Recibos cargados',
          data: rows.map((row: any) => this.mapRow(row))
        }))
      );
    }
    return this.http.GetRequest<ReciboResponse>('/recibos');
  }

  obtenerReciboPorId(id: number): Observable<ReciboResponse> {
    if (this.useSupabase) {
      return from((async () => {
        const { data, error } = await this.db
          .from(this.tableName)
          .select('*')
          .eq('id', Number(id))
          .eq('usuario', this.usuarioActual())
          .maybeSingle();
        if (error) throw error;
        return data;
      })()).pipe(
        map((row: any) => ({
          status: 'success',
          code: 200,
          message: 'Recibo cargado',
          data: row ? this.mapRow(row) : null as any
        }))
      );
    }
    return this.http.GetRequest<ReciboResponse>(`/recibos/${id}`);
  }

  actualizarRecibo(id: number, data: ReciboData): Observable<ReciboResponse> {
    if (this.useSupabase) {
      const payload = this.mapToDb(data);
      return from((async () => {
        const { data: row, error } = await this.db
          .from(this.tableName)
          .update(payload)
          .eq('id', Number(id))
          .eq('usuario', this.usuarioActual())
          .select('*')
          .maybeSingle();
        if (error) throw error;
        return row;
      })()).pipe(
        map((row: any) => ({
          status: 'success',
          code: 200,
          message: 'Recibo actualizado',
          data: row ? this.mapRow(row) : null as any
        }))
      );
    }
    return this.http.PutRequest<ReciboResponse, ReciboData>(`/recibos/${id}`, data);
  }

  eliminarRecibo(id: number): Observable<ReciboResponse> {
    if (this.useSupabase) {
      return from((async () => {
        const { error } = await this.db
          .from(this.tableName)
          .delete()
          .eq('id', Number(id))
          .eq('usuario', this.usuarioActual());
        if (error) throw error;
        return true;
      })()).pipe(
        map(() => ({
          status: 'success',
          code: 200,
          message: 'Recibo eliminado',
          data: [] as ReciboData[]
        }))
      );
    }
    return this.http.DeleteRequest<ReciboResponse, any>(`/recibos/${id}`, {});
  }
}
