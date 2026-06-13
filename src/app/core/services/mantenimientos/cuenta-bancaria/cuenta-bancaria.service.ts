import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from '../../supabase/supabase.service';
import { CuentaBancariaData, MonedaCuentaBancaria, TipoCuentaBancaria } from '.';

@Injectable({
  providedIn: 'root',
})
export class ServicioCuentaBancaria {
  constructor(private supabase: SupabaseService) {}

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

  buscarTodos(
    pageIndex = 1,
    pageSize = 25,
    filtro = '',
    soloActivas = false,
  ): Observable<any> {
    const offset = Math.max(pageIndex - 1, 0) * pageSize;
    const busqueda = this.limpiarFiltro(filtro);

    return from((async () => {
      let query = this.db
        .from('cuentas_bancarias')
        .select('*', { count: 'exact' })
        .order('activo', { ascending: false })
        .order('es_default', { ascending: false })
        .order('banco', { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (soloActivas) {
        query = query.eq('activo', true);
      }

      if (busqueda) {
        query = query.or(
          [
            `codigo.ilike.%${busqueda}%`,
            `nombre.ilike.%${busqueda}%`,
            `banco.ilike.%${busqueda}%`,
            `numero_cuenta.ilike.%${busqueda}%`,
            `titular.ilike.%${busqueda}%`,
          ].join(','),
        );
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        rows: data || [],
        total: Number(count ?? 0),
      };
    })()).pipe(
      map((result: { rows: any[]; total: number }) => ({
        status: 'success',
        code: 200,
        message: 'Cuentas bancarias cargadas',
        data: result.rows.map((row) => this.mapRow(row)),
        pagination: {
          total: result.total,
          page: pageIndex,
          pageSize,
        },
      })),
    );
  }

  obtenerActivas(): Observable<any> {
    return from((async () => {
      const { data, error } = await this.db
        .from('cuentas_bancarias')
        .select('*')
        .eq('activo', true)
        .order('es_default', { ascending: false })
        .order('banco', { ascending: true });

      if (error) throw error;
      return data || [];
    })()).pipe(
      map((rows: any[]) => ({
        status: 'success',
        code: 200,
        message: 'Cuentas bancarias activas cargadas',
        data: rows.map((row) => this.mapRow(row)),
      })),
    );
  }

  guardar(cuenta: CuentaBancariaData): Observable<any> {
    const payload = this.toPayload(cuenta);

    return from((async () => {
      const { data, error } = await this.db
        .from('cuentas_bancarias')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: 'success',
        code: 200,
        message: 'Cuenta bancaria guardada',
        data: this.mapRow(row),
      })),
    );
  }

  editar(id: number, cuenta: CuentaBancariaData): Observable<any> {
    const payload = this.toPayload(cuenta);

    return from((async () => {
      const { data, error } = await this.db
        .from('cuentas_bancarias')
        .update(payload)
        .eq('id', Number(id))
        .select('*')
        .maybeSingle();

      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: 'success',
        code: 200,
        message: 'Cuenta bancaria actualizada',
        data: row ? this.mapRow(row) : null,
      })),
    );
  }

  eliminar(id: number): Observable<any> {
    return from((async () => {
      const { error } = await this.db
        .from('cuentas_bancarias')
        .delete()
        .eq('id', Number(id));

      if (error) throw error;
      return true;
    })()).pipe(
      map(() => ({
        status: 'success',
        code: 200,
        message: 'Cuenta bancaria eliminada',
      })),
    );
  }

  private toPayload(cuenta: CuentaBancariaData): any {
    const payload: any = {
      codigo: String(cuenta?.codigo || '').trim().toUpperCase(),
      nombre: String(cuenta?.nombre || '').trim(),
      banco: String(cuenta?.banco || '').trim(),
      numero_cuenta: String(cuenta?.numero_cuenta || '').trim(),
      tipo_cuenta: this.normalizarTipo(cuenta?.tipo_cuenta),
      moneda: this.normalizarMoneda(cuenta?.moneda),
      titular: this.nullSiVacio(cuenta?.titular),
      cod_empre: this.nullSiVacio(cuenta?.cod_empre),
      sucursalid: cuenta?.sucursalid ? Number(cuenta.sucursalid) : null,
      es_default: !!cuenta?.es_default,
      activo: cuenta?.activo !== false,
      notas: this.nullSiVacio(cuenta?.notas),
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) delete payload[key];
    });

    return payload;
  }

  private mapRow(row: any): CuentaBancariaData {
    const cuenta = String(row?.numero_cuenta || '').trim();
    const ultimos = cuenta ? cuenta.slice(-4).padStart(Math.min(cuenta.length, 4), '*') : '';
    const banco = String(row?.banco || '').trim();
    const nombre = String(row?.nombre || '').trim();

    return {
      id: row?.id !== undefined && row?.id !== null ? Number(row.id) : undefined,
      codigo: String(row?.codigo || '').trim(),
      nombre,
      banco,
      numero_cuenta: cuenta,
      tipo_cuenta: this.normalizarTipo(row?.tipo_cuenta),
      moneda: this.normalizarMoneda(row?.moneda),
      titular: row?.titular ?? null,
      cod_empre: row?.cod_empre ?? null,
      sucursalid: row?.sucursalid !== undefined && row?.sucursalid !== null
        ? Number(row.sucursalid)
        : null,
      es_default: !!row?.es_default,
      activo: row?.activo !== false,
      notas: row?.notas ?? null,
      creado_en: row?.creado_en,
      actualizado_en: row?.actualizado_en,
      descripcion: `${banco}${nombre ? ` - ${nombre}` : ''}${ultimos ? ` (...${ultimos})` : ''}`.trim(),
    };
  }

  private normalizarTipo(value: any): TipoCuentaBancaria {
    const tipo = String(value || '').trim().toUpperCase();
    if (tipo === 'AHORRO' || tipo === 'TARJETA' || tipo === 'OTRA') return tipo;
    return 'CORRIENTE';
  }

  private normalizarMoneda(value: any): MonedaCuentaBancaria {
    const moneda = String(value || '').trim().toUpperCase();
    if (moneda === 'USD' || moneda === 'EUR') return moneda;
    return 'DOP';
  }

  private nullSiVacio(value: any): string | null {
    const texto = String(value ?? '').trim();
    return texto || null;
  }

  private limpiarFiltro(value: string): string {
    return String(value || '')
      .trim()
      .replace(/[%(),]/g, ' ')
      .replace(/\s+/g, ' ');
  }
}
