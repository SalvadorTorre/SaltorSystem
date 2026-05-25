import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { SucursalModel } from '.';
import { SupabaseService } from '../../supabase/supabase.service';
import { ServicioInventario } from '../inventario/inventario.service';

@Injectable({
  providedIn: 'root',
})
export class ServicioSucursal {
  constructor(
    private supabase: SupabaseService,
    private servicioInventario: ServicioInventario
  ) {}

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

  guardarSucursal(sucursal: any): Observable<any> {
    const payload = {
      nom_sucursal: sucursal?.nom_sucursal ?? sucursal?.nombre ?? '',
      zona: sucursal?.zona ?? null,
      cod_empre: sucursal?.cod_empre ?? null,
      dir_sucursal: sucursal?.dir_sucursal ?? null,
      tel_sucursal: sucursal?.tel_sucursal ?? null,
    };

    return from((async () => {
      const { data, error } = await this.db
        .from('sucursales')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;

      let inventorySeed: any = null;
      try {
        const seedResp = await new Promise<any>((resolve, reject) => {
          this.servicioInventario
            .sembrarInventarioSucursalDesdeCatalogo({
              inv_codsucu: Number(data?.cod_sucursal),
              sobrescribirExistentes: false,
              existenciaInicial: 0,
            })
            .subscribe({
              next: resolve,
              error: reject,
            });
        });
        inventorySeed = seedResp?.data || null;
      } catch (seedError: any) {
        inventorySeed = {
          error: String(seedError?.message || 'No se pudo sembrar el inventario base.'),
        };
      }

      return {
        ...data,
        inventorySeed,
      };
    })()).pipe(
      map((row: any) => ({ status: 'success', code: 200, data: row }))
    );
  }

  editaSucursal(cod_sucursal: string, sucursal: SucursalModel): Observable<any> {
    const payload: any = {
      nom_sucursal: (sucursal as any)?.nom_sucursal ?? undefined,
      zona: (sucursal as any)?.zona ?? undefined,
      cod_empre: (sucursal as any)?.cod_empre ?? undefined,
      dir_sucursal: (sucursal as any)?.dir_sucursal ?? undefined,
      tel_sucursal: (sucursal as any)?.tel_sucursal ?? undefined,
    };

    Object.keys(payload).forEach((key: string) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    return from((async () => {
      const { data, error } = await this.db
        .from('sucursales')
        .update(payload)
        .eq('cod_sucursal', Number(cod_sucursal))
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({ status: 'success', code: 200, data: row }))
    );
  }

  buscarTodasSucursal(): Observable<any> {
    return from((async () => {
      const { data, error } = await this.db
        .from('sucursales')
        .select('*')
        .order('cod_sucursal', { ascending: true });
      if (error) throw error;
      return data || [];
    })()).pipe(
      map((rows: any[]) => ({ status: 'success', code: 200, data: rows }))
    );
  }

  buscarPorNombreSucursal(valor: string): Observable<any> {
    const termino = (valor || '').toString().trim();
    return from((async () => {
      if (!termino) {
        return [];
      }

      const query = this.db
        .from('sucursales')
        .select('*')
        .order('nom_sucursal', { ascending: true })
        .limit(50);

      const { data, error } = /^\d+$/.test(termino)
        ? await query.or(`nom_sucursal.ilike.%${termino}%,cod_sucursal.eq.${Number(termino)}`)
        : await query.ilike('nom_sucursal', `%${termino}%`);

      if (error) throw error;
      return data || [];
    })()).pipe(
      map((rows: any[]) => ({ status: 'success', code: 200, data: rows }))
    );
  }

  eliminarSucursal(cod_sucursal: string): Observable<any> {
    return from((async () => {
      const { error } = await this.db
        .from('sucursales')
        .delete()
        .eq('cod_sucursal', Number(cod_sucursal));
      if (error) throw error;
      return true;
    })()).pipe(
      map(() => ({ status: 'success', code: 200 }))
    );
  }

  buscarsucursal(cod_sucursal: string): Observable<any> {
    return from((async () => {
      const { data, error } = await this.db
        .from('sucursales')
        .select('*')
        .eq('cod_sucursal', Number(cod_sucursal))
        .maybeSingle();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({ status: 'success', code: 200, data: row }))
    );
  }
}
