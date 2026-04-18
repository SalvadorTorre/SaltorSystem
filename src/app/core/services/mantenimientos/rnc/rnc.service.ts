import { Injectable } from '@angular/core';
import { ModeloRnc, ModeloRncData } from '.';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable({
  providedIn: 'root',
})
export class ServicioRnc {
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

  private mapRow(row: any): ModeloRncData {
    return {
      id: Number(row?.id ?? 0),
      rnc: String(row?.rnc ?? '').trim(),
      rason: String(row?.rason ?? '').trim(),
      status: row?.status ?? null,
    };
  }

  private buildPagination(pageIndex: number, limit: number, total: number) {
    return {
      total,
      page: pageIndex,
      limit,
      pageSize: limit,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
    };
  }

  buscarTodosRnc(
    pageIndex: number,
    pageSize: number,
    search?: string
  ): Observable<any> {
    const offset = Math.max(pageIndex - 1, 0) * pageSize;
    return from((async () => {
      let query = this.db
        .from('rnc')
        .select('*', { count: 'exact' })
        .order('id', { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (search) {
        const term = String(search).trim();
        query = query.or(`rnc.ilike.%${term}%,rason.ilike.%${term}%,status.ilike.%${term}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      const rows = (data || []).map((row: any) => this.mapRow(row));
      return {
        status: 'success',
        code: 200,
        message: '',
        data: {
          data: rows,
          pagination: this.buildPagination(pageIndex, pageSize, Number(count ?? 0)),
        },
      };
    })());
  }

  guardaRnc(rnc: ModeloRncData): Observable<any> {
    const payload = {
      rnc: String((rnc as any)?.rnc ?? '').trim(),
      rason: String((rnc as any)?.rason ?? '').trim(),
      status: (rnc as any)?.status ?? null,
    };
    return from((async () => {
      const { data, error } = await this.db
        .from('rnc')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return this.mapRow(data);
    })()).pipe(
      map((row: ModeloRncData) => ({ status: 'success', code: 200, data: row }))
    );
  }

  editarRnc(id: number, rnc: any): Observable<any> {
    const payload: any = {
      rnc: rnc?.rnc !== undefined ? String(rnc.rnc).trim() : undefined,
      rason: rnc?.rason !== undefined ? String(rnc.rason).trim() : undefined,
      status: rnc?.status !== undefined ? rnc.status : undefined,
    };
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });
    return from((async () => {
      const { data, error } = await this.db
        .from('rnc')
        .update(payload)
        .eq('id', Number(id))
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return data ? this.mapRow(data) : null;
    })()).pipe(
      map((row: ModeloRncData | null) => ({ status: 'success', code: 200, data: row }))
    );
  }

  eliminarRnc(rnc: number): Observable<any> {
    return from((async () => {
      const { error } = await this.db
        .from('rnc')
        .delete()
        .eq('id', Number(rnc));
      if (error) throw error;
      return true;
    })()).pipe(
      map(() => ({ status: 'success', code: 200 }))
    );
  }

  buscarrnc(rnc: number): Observable<any> {
    return from((async () => {
      const { data, error } = await this.db
        .from('rnc')
        .select('*')
        .eq('id', Number(rnc))
        .maybeSingle();
      if (error) throw error;
      return data ? this.mapRow(data) : null;
    })()).pipe(
      map((row: ModeloRncData | null) => ({ status: 'success', code: 200, data: row }))
    );
  }

  buscartodoRnc(rnc: number): Observable<ModeloRnc> {
    return this.buscarrnc(rnc) as Observable<ModeloRnc>;
  }

  buscarRncPorId(rnc: string): Observable<any> {
    const codigo = String(rnc ?? '').trim();
    return from((async () => {
      const { data, error } = await this.db
        .from('rnc')
        .select('*')
        .eq('rnc', codigo)
        .order('id', { ascending: true });
      if (error) throw error;
      return (data || []).map((row: any) => this.mapRow(row));
    })()).pipe(
      map((rows: ModeloRncData[]) => ({ status: 'success', code: 200, data: rows }))
    );
  }
  buscarRncPorrncId(rnc: string): Observable<any> {
    const codigo = String(rnc ?? '').trim();
    return from((async () => {
      const { data, error } = await this.db
        .from('rnc')
        .select('*')
        .eq('rnc', codigo)
        .maybeSingle();
      if (error) throw error;
      return data ? this.mapRow(data) : null;
    })()).pipe(
      map((row: ModeloRncData | null) => ({ status: 'success', code: 200, data: row }))
    );
  }

  importarDgii(): Observable<any> {
    return from((async () => {
      throw new Error('importarDgii no está disponible en Supabase');
    })()).pipe(
      map(() => ({ status: 'error', code: 501 }))
    );
  }
}
