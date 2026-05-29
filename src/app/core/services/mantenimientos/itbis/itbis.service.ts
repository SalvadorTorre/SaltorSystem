import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { HttpInvokeService } from '../../http-invoke.service';
import { SupabaseService } from '../../supabase/supabase.service';

export interface ItbisData {
  id?: number;
  codigo: string;
  descripcion: string;
  porcentaje: number;
  porcentaje_menos: number;
  nivel: string;
  estado: string;
  fecha_inicio: string;
  fecha_fin?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ServicioItbis {
  constructor(
    private http: HttpInvokeService,
    private supabase: SupabaseService,
  ) {}

  private get useSupabase(): boolean {
    return Boolean(this.supabase?.enabled && this.supabase?.client);
  }

  private get db(): any {
    const client = this.supabase.client;
    if (!client) throw new Error('Supabase no esta configurado');
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

  private mapRow(row: any): ItbisData {
    return {
      id: row?.id ?? null,
      codigo: String(row?.codigo ?? row?.coditbis ?? '').trim(),
      descripcion: String(row?.descripcion ?? row?.desitbis ?? '').trim(),
      porcentaje: Number(row?.porcentaje ?? row?.tasa ?? row?.valor ?? 0),
      porcentaje_menos: Number(row?.porcentaje_menos ?? row?.porcentajemenos ?? row?.tasa_menos ?? 0),
      nivel: String(row?.nivel ?? row?.nive ?? row?.nivel_uso ?? 'General').trim() || 'General',
      estado: String(row?.estado ?? row?.status ?? 'Activo').trim() || 'Activo',
      fecha_inicio: String(row?.fecha_inicio ?? row?.fecinicio ?? '').trim(),
      fecha_fin: row?.fecha_fin ?? row?.fecfin ?? null,
    };
  }

  private mapPayload(input: Partial<ItbisData>): any {
    return {
      codigo: String(input?.codigo ?? '').trim(),
      descripcion: String(input?.descripcion ?? '').trim(),
      porcentaje: Number(input?.porcentaje ?? 0),
      porcentaje_menos: Number(input?.porcentaje_menos ?? 0),
      nivel: String(input?.nivel ?? 'General').trim() || 'General',
      estado: String(input?.estado ?? 'Activo').trim() || 'Activo',
      fecha_inicio: String(input?.fecha_inicio ?? '').trim(),
      fecha_fin: input?.fecha_fin ? String(input.fecha_fin).trim() : null,
    };
  }

  buscarTodos(): Observable<ItbisData[]> {
    if (!this.useSupabase) {
      return this.http.GetRequest<any>('/itbis').pipe(
        map((res: any) => this.unwrap(res).map((row) => this.mapRow(row))),
      );
    }

    return from((async () => {
      const { data, error } = await this.db
        .from('itbis')
        .select('*')
        .order('id', { ascending: true });
      if (error) throw error;
      return (data || []).map((row: any) => this.mapRow(row));
    })());
  }

  buscarActivoPorNivel(nivel: string): Observable<ItbisData | null> {
    const value = String(nivel || '').trim();
    if (!value) {
      return from(Promise.resolve(null));
    }

    if (!this.useSupabase) {
      return this.http.GetRequest<any>('/itbis').pipe(
        map((res: any) => {
          const rows = this.unwrap(res).map((row) => this.mapRow(row));
          return rows.find((row) =>
            row.estado.toLowerCase() === 'activo' &&
            row.nivel.toLowerCase() === value.toLowerCase()
          ) || null;
        }),
      );
    }

    return from((async () => {
      const { data, error } = await this.db
        .from('itbis')
        .select('*')
        .eq('estado', 'Activo')
        .ilike('nivel', value)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ? this.mapRow(data) : null;
    })());
  }

  guardar(payload: Partial<ItbisData>): Observable<ItbisData> {
    if (!this.useSupabase) {
      return this.http.PostRequest<any, any>('/itbis', payload).pipe(
        map((res: any) => this.mapRow(res?.data || res)),
      );
    }

    const row = this.mapPayload(payload);
    return from((async () => {
      const { data, error } = await this.db
        .from('itbis')
        .insert(row)
        .select('*')
        .single();
      if (error) throw error;
      return this.mapRow(data);
    })());
  }

  editar(id: number, payload: Partial<ItbisData>): Observable<ItbisData> {
    if (!this.useSupabase) {
      return this.http.PutRequest<any, any>(`/itbis/${id}`, payload).pipe(
        map((res: any) => this.mapRow(res?.data || res)),
      );
    }

    const row = this.mapPayload(payload);
    return from((async () => {
      const { data, error } = await this.db
        .from('itbis')
        .update(row)
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return this.mapRow(data);
    })());
  }

  eliminar(id: number): Observable<any> {
    if (!this.useSupabase) {
      return this.http.DeleteRequest(`/itbis/${id}`, '');
    }

    return from((async () => {
      const { error } = await this.db.from('itbis').delete().eq('id', id);
      if (error) throw error;
      return { status: 'success', code: 200 };
    })());
  }

  private unwrap(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.items)) return res.items;
    return [];
  }
}
