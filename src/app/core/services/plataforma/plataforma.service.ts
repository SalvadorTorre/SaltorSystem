import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';

export interface EmpresaPlataforma {
  cod_empre: string;
  nom_empre: string;
  rnc_empre: string;
  tel_empre: string;
  dir_empre: string;
  letra_empre?: string;
  activa: boolean;
  fecha_suspension?: string | null;
  motivo_suspension?: string | null;
  sucursales: number;
  usuarios: number;
  facturas_mes: number;
  ventas_mes: number;
  ultima_factura?: string | null;
}

/**
 * Opcion Plataforma: solo para el dueno del sistema. Todas las funciones de la
 * base validan que quien llama sea el dueno (myappdb.plataforma_duenos).
 */
@Injectable({ providedIn: 'root' })
export class ServicioPlataforma {
  private esDuenoCache: boolean | null = null;
  private esDuenoPromise: Promise<boolean> | null = null;

  constructor(private readonly supabase: SupabaseService) {}

  private get db(): any {
    const client = this.supabase.client as any;
    if (!client) throw new Error('Supabase no está configurado');
    if (typeof client.schema === 'function') {
      try {
        return client.schema(this.supabase.schema);
      } catch {
        return client;
      }
    }
    return client;
  }

  private faltaMigracion(error: any): boolean {
    const code = String(error?.code || '');
    return code === 'PGRST202' || code === '42883';
  }

  private errorPlataforma(error: any): Error {
    if (this.faltaMigracion(error)) {
      return new Error(
        'Falta ejecutar en Supabase la migración 20261023010000_plataforma_dueno.sql.',
      );
    }
    return new Error(String(error?.message || error || 'Error en Plataforma'));
  }

  limpiarCache(): void {
    this.esDuenoCache = null;
    this.esDuenoPromise = null;
    localStorage.removeItem('esDuenoPlataforma');
  }

  /** true solo para el dueno de la plataforma. Nunca lanza error. */
  esDueno(force = false): Promise<boolean> {
    if (!force && this.esDuenoCache !== null) {
      return Promise.resolve(this.esDuenoCache);
    }
    if (!force && this.esDuenoPromise) return this.esDuenoPromise;

    this.esDuenoPromise = (async () => {
      try {
        if (!this.supabase?.client) return false;
        const { data, error } = await this.db.rpc('plataforma_es_dueno');
        const valor = !error && data === true;
        this.esDuenoCache = valor;
        localStorage.setItem('esDuenoPlataforma', valor ? 'S' : 'N');
        return valor;
      } catch {
        return false;
      } finally {
        this.esDuenoPromise = null;
      }
    })();
    return this.esDuenoPromise;
  }

  /** Se usa al iniciar sesion: una empresa suspendida no puede entrar. */
  async estadoAcceso(): Promise<{ permitido: boolean; dueno?: boolean; empresa?: string; motivo?: string }> {
    try {
      const { data, error } = await this.db.rpc('empresa_estado_acceso');
      if (error) {
        // Sin la migracion no se bloquea a nadie.
        return { permitido: true };
      }
      const estado = data || {};
      if (typeof estado?.dueno === 'boolean') {
        this.esDuenoCache = estado.dueno;
        localStorage.setItem('esDuenoPlataforma', estado.dueno ? 'S' : 'N');
      }
      return {
        permitido: estado?.permitido !== false,
        dueno: !!estado?.dueno,
        empresa: estado?.empresa || '',
        motivo: estado?.motivo || '',
      };
    } catch {
      return { permitido: true };
    }
  }

  listarEmpresas(): Observable<EmpresaPlataforma[]> {
    return from((async () => {
      const { data, error } = await this.db.rpc('plataforma_listar_empresas');
      if (error) throw this.errorPlataforma(error);
      const rows = Array.isArray(data) ? data : [];
      return rows.map((r: any) => ({
        ...r,
        cod_empre: String(r?.cod_empre ?? '').trim(),
        activa: r?.activa !== false,
        sucursales: Number(r?.sucursales || 0),
        usuarios: Number(r?.usuarios || 0),
        facturas_mes: Number(r?.facturas_mes || 0),
        ventas_mes: Number(r?.ventas_mes || 0),
      })) as EmpresaPlataforma[];
    })());
  }

  cambiarEstadoEmpresa(codEmpre: string, activa: boolean, motivo?: string): Observable<any> {
    return from((async () => {
      const { data, error } = await this.db.rpc('plataforma_cambiar_estado_empresa', {
        p_cod_empre: codEmpre,
        p_activa: activa,
        p_motivo: motivo || null,
      });
      if (error) throw this.errorPlataforma(error);
      return data;
    })());
  }

  entrarEmpresa(codEmpre: string, sucursalId?: number | null): Observable<any> {
    return from((async () => {
      const { data, error } = await this.db.rpc('plataforma_entrar_empresa', {
        p_cod_empre: codEmpre,
        p_sucursal_id: sucursalId || null,
      });
      if (error) throw this.errorPlataforma(error);
      return data;
    })());
  }

  listarSucursales(codEmpre: string): Observable<any[]> {
    return from((async () => {
      const { data, error } = await this.db
        .from('sucursales')
        .select('cod_sucursal,nom_sucursal,cod_empre')
        .eq('cod_empre', codEmpre)
        .order('cod_sucursal', { ascending: true });
      if (error) throw error;
      return data || [];
    })());
  }

  listarTiposUsuario(): Observable<any[]> {
    return from((async () => {
      const { data, error } = await this.db
        .from('tipousuario')
        .select('id,descripcion')
        .order('id', { ascending: true });
      if (error) throw error;
      return data || [];
    })());
  }
}
