import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { HttpInvokeService } from '../../http-invoke.service';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class ServicioCierreCaja {
  constructor(
    private http: HttpInvokeService,
    private supabase: SupabaseService
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

  private toNumber(value: any): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  private normalizeDate(value: any): string | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private mapRow(row: any): any {
    if (!row) return row;
    return {
      ...row,
      cc_finFact: row.factfin ?? row.cc_finFact ?? '',
      codsucursal: row.codsucursal ?? row.idsucursal ?? row.idSucursal ?? null,
      idsucursal: row.codsucursal ?? row.idsucursal ?? row.idSucursal ?? null,
      totalcierre: this.toNumber(row.totalcierre),
      tefectivo: this.toNumber(row.tefectivo),
      ttarjeta: this.toNumber(row.ttarjeta),
      tdeposito: this.toNumber(row.tdeposito),
      tcheque: this.toNumber(row.tcheque),
    };
  }

  obtenerUltimoCierre(sucursalId?: number | string | null): Observable<any> {
    if (!this.useSupabase) {
      return this.http.GetRequest<any>('/cierrecaja');
    }

    const sucursal = this.toNumber(sucursalId);
    return from((async () => {
      let query = this.db
        .from('cierrecaja')
        .select('*')
        .order('idcierre', { ascending: false })
        .limit(10);

      if (sucursal > 0) {
        query = query.eq('codsucursal', sucursal);
      }

      const { data, error } = await query;
      if (error) throw error;
      return {
        status: 'success',
        code: 200,
        data: (data || []).map((row: any) => this.mapRow(row)),
      };
    })());
  }

  crearCierre(data: any): Observable<any> {
    if (!this.useSupabase) {
      return this.http.PostRequest<any, any>('/cierrecaja', data);
    }

    const codsucursal = this.toNumber(data?.codsucursal ?? data?.idsucursal ?? data?.idSucursal);
    const payload = {
      feccierre: this.normalizeDate(data?.feccierre) || this.normalizeDate(new Date()),
      tefectivo: this.toNumber(data?.tefectivo ?? data?.efectivo),
      ttarjeta: this.toNumber(data?.ttarjeta ?? data?.tarjeta),
      tdeposito: this.toNumber(data?.tdeposito ?? data?.deposito),
      totalcierre: this.toNumber(data?.totalcierre ?? data?.montocierre),
      tcheque: this.toNumber(data?.tcheque ?? data?.cheque),
      factini: data?.factini ?? null,
      factfin: data?.factfin ?? null,
      codsucursal: codsucursal > 0 ? codsucursal : null,
      cajera: data?.cajera ?? localStorage.getItem('nombreusuario') ?? null,
      nota: data?.nota ?? null,
    };

    return from((async () => {
      const { data: inserted, error } = await this.db
        .from('cierrecaja')
        .insert(payload)
        .select('*')
        .single();
      if (error) {
        console.error('Error creando cierre de caja', { payload, error });
        throw error;
      }
      return {
        status: 'success',
        code: 200,
        data: this.mapRow(inserted),
      };
    })());
  }
}
