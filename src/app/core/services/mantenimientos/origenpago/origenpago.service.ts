import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable({
  providedIn: 'root',
})
export class ServicioOrigenPago {
  constructor(private supabase: SupabaseService) {}

  private get client(): any {
    const client = this.supabase.client;
    if (!client) {
      throw new Error('Supabase no esta configurado');
    }
    return client as any;
  }

  private get db(): any {
    const anyClient = this.client;
    if (typeof anyClient?.schema === 'function') {
      try {
        return anyClient.schema(this.supabase.schema);
      } catch {
        return anyClient;
      }
    }
    return anyClient;
  }

  private dbForSchema(schema: string): any {
    const anyClient = this.client;
    if (typeof anyClient?.schema === 'function') {
      try {
        return anyClient.schema(schema);
      } catch {
        return anyClient;
      }
    }
    return anyClient;
  }

  private mapRow(row: any): any {
    const keys = Object.keys(row || {});
    const findValue = (patterns: RegExp[]) => {
      const key = keys.find((k) => patterns.some((pattern) => pattern.test(k)));
      return key ? row[key] : undefined;
    };
    const codigo =
      row?.op_codorigenpago ??
      row?.op_codOrigenPago ??
      row?.op_codigo ??
      row?.codigo ??
      row?.codorigenpago ??
      row?.codOrigenPago ??
      row?.idorigenpago ??
      row?.idOrigenPago ??
      row?.id ??
      findValue([/^cod/i, /^id/i, /codigo/i]) ??
      '';
    const descripcion =
      row?.op_descorigenpago ??
      row?.op_descOrigenPago ??
      row?.op_descripcion ??
      row?.descripcion ??
      row?.descorigenpago ??
      row?.descOrigenPago ??
      row?.desorigenpago ??
      row?.desOrigenPago ??
      row?.origenpago ??
      row?.nombre ??
      findValue([/^desc/i, /^des/i, /descripcion/i, /nombre/i, /origen/i]) ??
      keys
        .map((key) => row[key])
        .find((value) => value !== null && value !== undefined && String(value).trim()) ??
      codigo;

    return {
      ...row,
      codigo: String(codigo ?? '').trim(),
      descripcion: String(descripcion ?? '').trim(),
    };
  }

  obtenerTodosOrigenPago(): Observable<any> {
    return from((async () => {
      const schemas = Array.from(
        new Set([this.supabase.schema || 'public', 'public']),
      );
      let lastError: any = null;

      for (const schema of schemas) {
        const { data, error } = await this.dbForSchema(schema)
          .from('origenpago')
          .select('*');
        if (error) {
          lastError = error;
          continue;
        }
        if ((data || []).length > 0) {
          return data || [];
        }
      }

      if (lastError) {
        console.warn('No se pudo consultar origenpago:', lastError);
      }
      return [];
    })()).pipe(
      map((rows: any[]) => ({
        status: 'success',
        code: 200,
        message: 'Origenes de pago cargados',
        data: rows.map((row: any) => this.mapRow(row)),
      })),
    );
  }
}
