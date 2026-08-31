import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { SupabaseService } from '../../supabase/supabase.service';

export interface FacturaRecuperacionPayload {
  fa_codfact: string;
  fa_fpago: 'S';
  fa_status: 'U';
  fa_impresa: 'S';
  fa_tiponcf: 32;
  fa_codempr: string;
  fa_codsucu: number;
}

@Injectable({ providedIn: 'root' })
export class RecuperarFacturaService {
  constructor(private readonly supabase: SupabaseService) {}

  private get db(): any {
    const client = this.supabase.client;
    if (!this.supabase.enabled || !client) {
      throw new Error('Supabase no está configurado.');
    }
    const anyClient = client as any;
    return typeof anyClient.schema === 'function'
      ? anyClient.schema(this.supabase.schema)
      : anyClient;
  }

  existe(numero: string, empresa: string, sucursal: number): Observable<boolean> {
    return from((async () => {
      const { count, error } = await this.db
        .from('factura')
        .select('fa_codfact', { count: 'exact', head: true })
        .eq('fa_codfact', numero)
        .eq('fa_codempr', empresa)
        .eq('fa_codsucu', sucursal);
      if (error) throw error;
      return Number(count || 0) > 0;
    })());
  }

  guardar(payload: FacturaRecuperacionPayload): Observable<any> {
    return from((async () => {
      const { data, error } = await this.db
        .from('factura')
        // fa_codfact es la llave primaria global. Si el encabezado todavía existe
        // pero no es visible en una consulta normal, restauramos sus datos.
        .upsert(payload, { onConflict: 'fa_codfact' })
        .select('fa_codfact,fa_codsucu,fa_codempr,fa_fpago,fa_status,fa_impresa,fa_tiponcf')
        .maybeSingle();
      if (error) throw error;
      return data || payload;
    })());
  }
}
