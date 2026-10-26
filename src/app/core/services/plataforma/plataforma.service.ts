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

export interface DetalleVentasPlataforma {
  periodo_inicio: string;
  periodo_fin: string;
  documentos: number;
  facturas: number;
  total_facturado: number;
  conduces: number;
  total_conduce: number;
  pendientes: number;
  total_pendiente: number;
  total_periodo: number;
}

export interface ResumenVentasPlataforma {
  agrupacion: 'dia' | 'semana' | 'mes';
  fecha_desde: string;
  fecha_hasta: string;
  documentos: number;
  facturas: number;
  total_facturado: number;
  conduces: number;
  total_conduce: number;
  pendientes: number;
  total_pendiente: number;
  total_general: number;
  detalle: DetalleVentasPlataforma[];
}

export interface ConducePendientePlataforma {
  factura: string;
  fecha: string;
  cliente: string;
  valor: number;
  acumulado: number;
}

export interface PreparacionPendientePlataforma {
  monto_solicitado: number;
  cantidad: number;
  suma_seleccionada: number;
  balance: number;
  conduces: ConducePendientePlataforma[];
}

export interface AlertaConducesPlataforma {
  activa: boolean;
  fecha_desde: string;
  fecha_hasta: string;
  cantidad: number;
  total: number;
  detalle: Array<{
    empresa: string;
    nombre_empresa: string;
    sucursal: number;
    nombre_sucursal: string;
    cantidad: number;
    total: number;
  }>;
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
        'Falta aplicar las migraciones recientes del módulo Plataforma en Supabase.',
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

  consultarVentas(params: {
    empresa?: string | null;
    sucursal?: number | null;
    fechaDesde: string;
    fechaHasta: string;
  }): Observable<ResumenVentasPlataforma> {
    return from((async () => {
      const empresa = String(params?.empresa || '').trim() || null;
      const sucursal = Number(params?.sucursal || 0) || null;
      const { data, error } = await this.db.rpc('plataforma_resumen_ventas', {
        p_empresa: empresa,
        p_sucursal: sucursal,
        p_fecha_desde: params.fechaDesde,
        p_fecha_hasta: params.fechaHasta,
      });
      if (error) throw this.errorPlataforma(error);

      const resultado = data || {};
      return {
        agrupacion: ['dia', 'semana', 'mes'].includes(resultado?.agrupacion)
          ? resultado.agrupacion
          : 'dia',
        fecha_desde: String(resultado?.fecha_desde || params.fechaDesde),
        fecha_hasta: String(resultado?.fecha_hasta || params.fechaHasta),
        documentos: Number(resultado?.documentos || 0),
        facturas: Number(resultado?.facturas || 0),
        total_facturado: Number(resultado?.total_facturado || 0),
        conduces: Number(resultado?.conduces || 0),
        total_conduce: Number(resultado?.total_conduce || 0),
        pendientes: Number(resultado?.pendientes || 0),
        total_pendiente: Number(resultado?.total_pendiente || 0),
        total_general: Number(resultado?.total_general || 0),
        detalle: (Array.isArray(resultado?.detalle) ? resultado.detalle : []).map((fila: any) => ({
          periodo_inicio: String(fila?.periodo_inicio || ''),
          periodo_fin: String(fila?.periodo_fin || ''),
          documentos: Number(fila?.documentos || 0),
          facturas: Number(fila?.facturas || 0),
          total_facturado: Number(fila?.total_facturado || 0),
          conduces: Number(fila?.conduces || 0),
          total_conduce: Number(fila?.total_conduce || 0),
          pendientes: Number(fila?.pendientes || 0),
          total_pendiente: Number(fila?.total_pendiente || 0),
          total_periodo: Number(fila?.total_periodo || 0),
        })),
      } as ResumenVentasPlataforma;
    })());
  }

  prepararPendiente(params: {
    empresa: string;
    sucursal: number;
    monto: number;
  }): Observable<PreparacionPendientePlataforma> {
    return from((async () => {
      const { data, error } = await this.db.rpc('plataforma_preparar_pendiente', {
        p_empresa: String(params.empresa || '').trim(),
        p_sucursal: Number(params.sucursal),
        p_monto: Number(params.monto),
      });
      if (error) throw this.errorPlataforma(error);
      return this.mapPreparacionPendiente(data);
    })());
  }

  confirmarPendiente(params: {
    empresa: string;
    sucursal: number;
    monto: number;
  }): Observable<any> {
    return from((async () => {
      const { data, error } = await this.db.rpc('plataforma_confirmar_pendiente', {
        p_empresa: String(params.empresa || '').trim(),
        p_sucursal: Number(params.sucursal),
        p_monto: Number(params.monto),
      });
      if (error) throw this.errorPlataforma(error);
      return {
        ...data,
        cantidad: Number(data?.cantidad || 0),
        suma_seleccionada: Number(data?.suma_seleccionada || 0),
        monto_solicitado: Number(data?.monto_solicitado || 0),
        balance: Number(data?.balance || 0),
      };
    })());
  }

  consultarAlertaConducesMesAnterior(): Observable<AlertaConducesPlataforma> {
    return from((async () => {
      const { data, error } = await this.db.rpc('plataforma_alerta_conduces_mes_anterior');
      if (error) throw this.errorPlataforma(error);
      return {
        activa: data?.activa === true,
        fecha_desde: String(data?.fecha_desde || ''),
        fecha_hasta: String(data?.fecha_hasta || ''),
        cantidad: Number(data?.cantidad || 0),
        total: Number(data?.total || 0),
        detalle: (Array.isArray(data?.detalle) ? data.detalle : []).map((fila: any) => ({
          empresa: String(fila?.empresa || ''),
          nombre_empresa: String(fila?.nombre_empresa || ''),
          sucursal: Number(fila?.sucursal || 0),
          nombre_sucursal: String(fila?.nombre_sucursal || ''),
          cantidad: Number(fila?.cantidad || 0),
          total: Number(fila?.total || 0),
        })),
      };
    })());
  }

  private mapPreparacionPendiente(data: any): PreparacionPendientePlataforma {
    return {
      monto_solicitado: Number(data?.monto_solicitado || 0),
      cantidad: Number(data?.cantidad || 0),
      suma_seleccionada: Number(data?.suma_seleccionada || 0),
      balance: Number(data?.balance || 0),
      conduces: (Array.isArray(data?.conduces) ? data.conduces : []).map((fila: any) => ({
        factura: String(fila?.factura || ''),
        fecha: String(fila?.fecha || ''),
        cliente: String(fila?.cliente || ''),
        valor: Number(fila?.valor || 0),
        acumulado: Number(fila?.acumulado || 0),
      })),
    };
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
