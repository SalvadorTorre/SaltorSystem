import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { SupabaseService } from '../../supabase/supabase.service';
import {
  BoletosFactura,
  ConcursoData,
  EstadoConcurso,
  RangoConcurso,
} from '.';

@Injectable({
  providedIn: 'root',
})
export class ServicioConcurso {
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

  /** Empresa / sucursal de la sesion. */
  tenant(): { empresa: string; sucursal: number } {
    let empresaObj: any = null;
    try {
      empresaObj = JSON.parse(localStorage.getItem('empresa') || 'null');
    } catch {
      empresaObj = null;
    }
    return {
      empresa: String(
        localStorage.getItem('codigoempresa') ||
          localStorage.getItem('cod_empre') ||
          empresaObj?.cod_empre ||
          '',
      ).trim(),
      sucursal: Number(localStorage.getItem('idSucursal') || 0),
    };
  }

  /** Nombre de una empresa por su codigo (vacio si no se encuentra). */
  nombreEmpresa(codigo: string): Observable<string> {
    const cod = String(codigo || '').trim().toUpperCase();
    return from((async () => {
      if (!cod) return '';
      const { data, error } = await this.db
        .from('empresas')
        .select('cod_empre,nom_empre')
        .eq('cod_empre', cod)
        .limit(1)
        .maybeSingle();
      if (error) return '';
      return String(data?.nom_empre || '').trim();
    })());
  }

  listar(): Observable<ConcursoData[]> {
    return from((async () => {
      const { data, error } = await this.db
        .from('concurso')
        .select('*')
        .order('activo', { ascending: false })
        .order('fecha_inicio', { ascending: false })
        .order('id', { ascending: false });
      if (error) throw error;
      return (data || []).map((row: any) => this.mapRow(row));
    })());
  }

  guardar(concurso: ConcursoData): Observable<ConcursoData> {
    const payload = this.toPayload(concurso);
    return from((async () => {
      const query = concurso.id
        ? this.db.from('concurso').update(payload).eq('id', Number(concurso.id))
        : this.db.from('concurso').insert(payload);
      const { data, error } = await query.select('*').maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error('No tiene permiso para guardar este concurso.');
      }
      return this.mapRow(data);
    })());
  }

  cambiarActivo(id: number, activo: boolean): Observable<ConcursoData> {
    return from((async () => {
      const { data, error } = await this.db
        .from('concurso')
        .update({ activo })
        .eq('id', Number(id))
        .select('*')
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error('No tiene permiso para modificar este concurso.');
      }
      return this.mapRow(data);
    })());
  }

  eliminar(id: number): Observable<boolean> {
    return from((async () => {
      const { error } = await this.db.from('concurso').delete().eq('id', Number(id));
      if (error) throw error;
      return true;
    })());
  }

  /**
   * Genera (o devuelve si ya existen) los boletos de una factura en los
   * concursos activos y vigentes. Lo usa Caja al cobrar.
   */
  generarBoletosFactura(codfact: string): Observable<BoletosFactura> {
    return from((async () => {
      const { data, error } = await this.db.rpc('generar_boletos_factura', {
        p_codfact: String(codfact || '').trim(),
      });
      if (error) throw error;
      const res: any = data || {};
      return {
        codfact: String(res.codfact || codfact || ''),
        fecha: String(res.fecha || '').slice(0, 10),
        cliente: res.cliente ?? '',
        telefono: res.telefono ?? '',
        concursos: (Array.isArray(res.concursos) ? res.concursos : []).map((c: any) => ({
          concurso_id: Number(c.concurso_id),
          nombre: String(c.nombre || ''),
          tipo: c.tipo === 'SORTEO' ? 'SORTEO' : 'RIFA',
          premios: c.premios ?? '',
          descripcion: c.descripcion ?? '',
          fecha_fin: String(c.fecha_fin || '').slice(0, 10),
          numeros: (Array.isArray(c.numeros) ? c.numeros : []).map((n: any) => Number(n)),
          nuevos: !!c.nuevos,
        })),
      } as BoletosFactura;
    })());
  }

  /** Explica por concurso por que una factura gana o no gana boletos. */
  diagnosticarBoletosFactura(codfact: string): Observable<any[]> {
    return from((async () => {
      const { data, error } = await this.db.rpc('diagnostico_boletos_factura', {
        p_codfact: String(codfact || '').trim(),
      });
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    })());
  }

  /** Concursos activos y vigentes para una fecha (por defecto hoy). */
  vigentes(fecha: Date = new Date()): Observable<ConcursoData[]> {
    const dia = this.fechaIso(fecha);
    return from((async () => {
      const { data, error } = await this.db
        .from('concurso')
        .select('*')
        .eq('activo', true)
        .lte('fecha_inicio', dia)
        .gte('fecha_fin', dia);
      if (error) throw error;
      return (data || []).map((row: any) => this.mapRow(row));
    })());
  }

  /**
   * Boletos que gana una factura segun las reglas del concurso.
   * `monto` debe venir ya en la base del concurso (total o subtotal).
   */
  calcularBoletos(concurso: ConcursoData, monto: number): number {
    const valor = Number(monto) || 0;
    if (valor <= 0) return 0;
    if (valor < (Number(concurso.monto_minimo) || 0)) return 0;

    let boletos = 0;
    if (concurso.modo === 'RANGO') {
      const escala = this.rangosOrdenados(concurso.rangos);
      for (let i = escala.length - 1; i >= 0; i--) {
        if (valor >= escala[i].desde) {
          boletos = escala[i].boletos;
          break;
        }
      }
    } else {
      const porBoleto = Number(concurso.monto_por_boleto) || 0;
      boletos = porBoleto > 0 ? Math.floor(valor / porBoleto) : 0;
    }

    const tope = Number(concurso.max_boletos_factura || 0);
    if (tope > 0) boletos = Math.min(boletos, tope);
    return Math.max(boletos, 0);
  }

  estado(concurso: ConcursoData, hoy: Date = new Date()): EstadoConcurso {
    if (!concurso.activo) return 'INACTIVO';
    const dia = this.fechaIso(hoy);
    if (dia < concurso.fecha_inicio) return 'PROGRAMADO';
    if (dia > concurso.fecha_fin) return 'FINALIZADO';
    return 'VIGENTE';
  }

  rangosOrdenados(rangos: RangoConcurso[] | null | undefined): RangoConcurso[] {
    return (Array.isArray(rangos) ? rangos : [])
      .map((r) => ({
        desde: Number(r?.desde) || 0,
        boletos: Math.floor(Number(r?.boletos) || 0),
      }))
      .filter((r) => r.desde > 0 && r.boletos > 0)
      .sort((a, b) => a.desde - b.desde);
  }

  fechaIso(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private toPayload(c: ConcursoData): any {
    const tope = Number(c.max_boletos_factura || 0);
    return {
      codempresa: String(c.codempresa || '').trim().toUpperCase(),
      codsucursal: Number(c.codsucursal || 0) > 0 ? Number(c.codsucursal) : null,
      nombre: String(c.nombre || '').trim(),
      tipo: c.tipo === 'SORTEO' ? 'SORTEO' : 'RIFA',
      descripcion: String(c.descripcion || '').trim() || null,
      premios: String(c.premios || '').trim() || null,
      fecha_inicio: c.fecha_inicio,
      fecha_fin: c.fecha_fin,
      activo: !!c.activo,
      modo: c.modo === 'RANGO' ? 'RANGO' : 'MULTIPLO',
      monto_por_boleto: c.modo === 'RANGO' ? 0 : Number(c.monto_por_boleto) || 0,
      monto_minimo: Number(c.monto_minimo) || 0,
      max_boletos_factura: tope > 0 ? Math.floor(tope) : null,
      rangos: c.modo === 'RANGO' ? this.rangosOrdenados(c.rangos) : [],
      base_calculo: c.base_calculo === 'SUBTOTAL' ? 'SUBTOTAL' : 'TOTAL',
      aplica_contado: !!c.aplica_contado,
      aplica_credito: !!c.aplica_credito,
      solo_pagadas: !!c.solo_pagadas,
      solo_clientes_registrados: !!c.solo_clientes_registrados,
    };
  }

  private mapRow(row: any): ConcursoData {
    return {
      id: row?.id != null ? Number(row.id) : undefined,
      codempresa: String(row?.codempresa || '').trim(),
      codsucursal: row?.codsucursal != null ? Number(row.codsucursal) : null,
      nombre: String(row?.nombre || '').trim(),
      tipo: row?.tipo === 'SORTEO' ? 'SORTEO' : 'RIFA',
      descripcion: row?.descripcion ?? '',
      premios: row?.premios ?? '',
      fecha_inicio: String(row?.fecha_inicio || '').slice(0, 10),
      fecha_fin: String(row?.fecha_fin || '').slice(0, 10),
      activo: !!row?.activo,
      modo: row?.modo === 'RANGO' ? 'RANGO' : 'MULTIPLO',
      monto_por_boleto: Number(row?.monto_por_boleto) || 0,
      monto_minimo: Number(row?.monto_minimo) || 0,
      max_boletos_factura:
        row?.max_boletos_factura != null ? Number(row.max_boletos_factura) : null,
      rangos: this.rangosOrdenados(row?.rangos),
      base_calculo: row?.base_calculo === 'SUBTOTAL' ? 'SUBTOTAL' : 'TOTAL',
      aplica_contado: row?.aplica_contado !== false,
      aplica_credito: row?.aplica_credito !== false,
      solo_pagadas: row?.solo_pagadas !== false,
      solo_clientes_registrados: row?.solo_clientes_registrados === true,
      ultimo_boleto: Number(row?.ultimo_boleto) || 0,
      created_at: row?.created_at,
      updated_at: row?.updated_at,
    };
  }
}
