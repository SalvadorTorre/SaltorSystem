import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpInvokeService } from '../../http-invoke.service';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable({
  providedIn: 'root',
})
export class ServicioContFactura {
  constructor(
    private http: HttpInvokeService,
    private supabase: SupabaseService,
  ) {}

  private get useSupabase(): boolean {
    return Boolean(this.supabase?.enabled && this.supabase?.client);
  }

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

  private async ensureSession(): Promise<void> {
    try {
      await this.supabase.recoverSession();
    } catch {
      // El guardado seguira y Supabase devolvera el error real si no hay sesion valida.
    }
  }

  private toNumberOrNull(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private toNumber(value: any): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  private isMissingColumnError(error: any): string | null {
    const message = String(error?.message || error?.error_description || error || '');
    const match = message.match(/'([^']+)'\s+column/) || message.match(/column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i);
    return match?.[1] || null;
  }

  private async saveRetryingMissingColumns(operation: (payload: any) => Promise<any>, payload: any): Promise<any> {
    const nextPayload = { ...payload };
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { data, error } = await operation(nextPayload);
      if (!error) return data;

      const missingColumn = this.isMissingColumnError(error);
      if (!missingColumn || !Object.prototype.hasOwnProperty.call(nextPayload, missingColumn)) {
        throw error;
      }
      delete nextPayload[missingColumn];
    }
    throw new Error('No se pudo guardar contfactura por columnas no disponibles.');
  }

  private mapRow(row: any): any {
    if (!row) return row;
    return {
      ...row,
      id: row.id ?? row.cod ?? row.idcontfact ?? row.idContFact ?? null,
      idsucursal: row.idsucursal ?? row.idSucursal ?? row.cod_sucursal ?? null,
      ano: row.ano ?? row.year ?? null,
      contador: row.contador ?? row.counter ?? null,
      contentrada: row.contentrada ?? row.contEntrada ?? row.cont_entrada ?? null,
      contsalida: row.contsalida ?? row.contSalida ?? row.cont_salida ?? null,
      contvinterna: row.contvinterna ?? row.contVInterna ?? row.cont_vinterna ?? null,
      contfact: row.contfact ?? row.contFact ?? row.cont_fact ?? null,
      contcotizacion: row.contcotizacion ?? row.contCotizacion ?? row.cont_cotizacion ?? null,
      contnotacredito: row.contnotacredito ?? row.contNotaCredito ?? row.cont_nota_credito ?? null,
    };
  }

  private mapPayload(input: any): any {
    const payload: any = {
      idsucursal: this.toNumberOrNull(
        input?.idsucursal ?? input?.idSucursal ?? input?.cod_sucursal,
      ),
      ano: this.toNumberOrNull(input?.ano ?? input?.year),
      contador: input?.contador !== undefined ? this.toNumber(input.contador) : undefined,
      contentrada:
        input?.contentrada !== undefined
          ? this.toNumber(input.contentrada)
          : undefined,
      contsalida:
        input?.contsalida !== undefined ? this.toNumber(input.contsalida) : undefined,
      contvinterna:
        input?.contvinterna !== undefined ? this.toNumber(input.contvinterna) : undefined,
      contfact:
        input?.contfact !== undefined ? this.toNumber(input.contfact) : undefined,
      contcotizacion:
        input?.contcotizacion !== undefined ? this.toNumber(input.contcotizacion) : undefined,
      contnotacredito:
        input?.contnotacredito !== undefined ? this.toNumber(input.contnotacredito) : undefined,
    };

    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k];
    });
    return payload;
  }

  // Lista con paginación y filtro por sucursal
  buscarTodos(
    pageIndex: number,
    pageSize: number,
    sucursal?: string | number,
  ): Observable<any> {
    let url = `/contfactura?page=${pageIndex}&limit=${pageSize}`;
    if (
      sucursal !== undefined &&
      sucursal !== null &&
      String(sucursal).length > 0
    ) {
      url += `&sucursal=${sucursal}`;
    }

    if (!this.useSupabase) {
      return this.http.GetRequest<any>(url);
    }

    const offset = Math.max(pageIndex - 1, 0) * pageSize;
    const suc = String(sucursal ?? '').trim();
    const sucNum = suc ? this.toNumberOrNull(suc) : null;

    return from(
      (async () => {
        let query = this.db
          .from('contfactura')
          .select('*', { count: 'exact' })
          .order('id', { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (sucNum !== null) query = query.eq('idsucursal', sucNum);

        const { data, error, count } = await query;
        if (error) throw error;

        return {
          rows: (data || []).map((r: any) => this.mapRow(r)),
          total: Number(count ?? 0),
        };
      })(),
    ).pipe(
      map((result: { rows: any[]; total: number }) => ({
        status: 'success',
        code: 200,
        data: result.rows,
        pagination: { total: result.total, page: pageIndex, pageSize },
      })),
    );
  }

  buscarPorSucursal(sucursal: number): Observable<any> {
    return this.buscarTodos(1, 1, sucursal);
  }

  // Lista simple
  obtenerTodos(): Observable<any> {
    if (!this.useSupabase) {
      return this.http.GetRequest<any>(`/contfactura`);
    }

    return from(
      (async () => {
        const { data, error } = await this.db
          .from('contfactura')
          .select('*')
          .order('id', { ascending: false });
        if (error) throw error;
        return (data || []).map((r: any) => this.mapRow(r));
      })(),
    ).pipe(map((rows: any[]) => ({ status: 'success', code: 200, data: rows })));
  }

  // Detalle por id
  buscarPorId(id: number): Observable<any> {
    if (!this.useSupabase) {
      return this.http.GetRequest<any>(`/contfactura/${id}`);
    }

    const safeId = this.toNumberOrNull(id);
    if (safeId === null) {
      return from(Promise.resolve({ status: 'success', code: 200, data: null }));
    }

    return from(
      (async () => {
        const { data, error } = await this.db
          .from('contfactura')
          .select('*')
          .eq('id', safeId)
          .maybeSingle();
        if (error) throw error;
        return data ? this.mapRow(data) : null;
      })(),
    ).pipe(map((row: any) => ({ status: 'success', code: 200, data: row })));
  }

  // Crear
  guardarContFactura(payload: any): Observable<any> {
    if (!this.useSupabase) {
      return this.http.PostRequest<any, any>(`/contfactura`, payload);
    }

    const dbPayload = this.mapPayload(payload);
    return from(
      (async () => {
        await this.ensureSession();
        const data = await this.saveRetryingMissingColumns(
          (nextPayload: any) => this.db
            .from('contfactura')
            .insert(nextPayload)
            .select('*')
            .single(),
          dbPayload,
        );
        return this.mapRow(data);
      })(),
    ).pipe(map((row: any) => ({ status: 'success', code: 200, data: row })));
  }

  // Editar
  editarContFactura(id: number, payload: any): Observable<any> {
    if (!this.useSupabase) {
      return this.http.PutRequest<any, any>(`/contfactura/${id}`, payload);
    }

    const safeId = this.toNumberOrNull(id);
    if (safeId === null) return from(Promise.reject(new Error('id inválido')));

    const dbPayload = this.mapPayload(payload);
    return from(
      (async () => {
        await this.ensureSession();
        const data = await this.saveRetryingMissingColumns(
          (nextPayload: any) => this.db
            .from('contfactura')
            .update(nextPayload)
            .eq('id', safeId)
            .select('*')
            .maybeSingle(),
          dbPayload,
        );
        return data ? this.mapRow(data) : null;
      })(),
    ).pipe(map((row: any) => ({ status: 'success', code: 200, data: row })));
  }

  // Eliminar
  eliminarContFactura(id: number): Observable<any> {
    if (!this.useSupabase) {
      return this.http.DeleteRequest(`/contfactura/${id}`, '');
    }

    const safeId = this.toNumberOrNull(id);
    if (safeId === null) return from(Promise.reject(new Error('id inválido')));

    return from(
      (async () => {
        await this.ensureSession();
        const { error } = await this.db
          .from('contfactura')
          .delete()
          .eq('id', safeId);
        if (error) throw error;
        return { status: 'success', code: 200, data: true };
      })(),
    );
  }
}

