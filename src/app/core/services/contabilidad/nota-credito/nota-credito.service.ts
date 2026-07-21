import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from '../../supabase/supabase.service';

export interface NotaCreditoPayload {
  header: Record<string, any>;
  lines: Record<string, any>[];
}

@Injectable({
  providedIn: 'root',
})
export class NotaCreditoService {
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

  private tenant(): { codempr: string; codsucu: number; usuario: string } {
    const empresaRaw = localStorage.getItem('empresa');
    let empresaObj: any = null;
    try {
      empresaObj = empresaRaw ? JSON.parse(empresaRaw) : null;
    } catch {
      empresaObj = null;
    }

    const codempr = String(
      localStorage.getItem('codigoempresa') ||
        localStorage.getItem('cod_empre') ||
        empresaObj?.cod_empre ||
        '',
    ).trim();
    const codsucu = Number(localStorage.getItem('idSucursal') || 0);
    const usuario = String(localStorage.getItem('usuario') || localStorage.getItem('user') || '').trim();
    return { codempr, codsucu, usuario };
  }

  private toNumber(value: any): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  private toNumberOrNull(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private buildNotaCreditoCode(ano: number, idsucursal: number, contador: number): string {
    const anoStr = String(ano || new Date().getFullYear()).padStart(4, '0').slice(-4);
    const sucursalStr = String(idsucursal || 0).padStart(2, '0').slice(-2);
    const contStr = String(contador || 0).padStart(5, '0').slice(-5);
    return `${anoStr}${sucursalStr}${contStr}`;
  }

  private contfacturaIdField(row: any): string {
    if (Object.prototype.hasOwnProperty.call(row || {}, 'id')) return 'id';
    if (Object.prototype.hasOwnProperty.call(row || {}, 'cod')) return 'cod';
    if (Object.prototype.hasOwnProperty.call(row || {}, 'idcontfact')) return 'idcontfact';
    if (Object.prototype.hasOwnProperty.call(row || {}, 'idContFact')) return 'idContFact';
    return '';
  }

  private async getOrPickContFacturaRow(idsucursal: number): Promise<any | null> {
    const year = new Date().getFullYear();
    const { data, error } = await this.db
      .from('contfactura')
      .select('*')
      .order('id', { ascending: false })
      .limit(200);
    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    return (
      rows.find(
        (row: any) =>
          this.toNumber(row?.idsucursal) === idsucursal &&
          this.toNumber(row?.ano) === year,
      ) ||
      rows.find((row: any) => this.toNumber(row?.idsucursal) === idsucursal) ||
      rows.find(
        (row: any) =>
          row?.idsucursal === null ||
          row?.idsucursal === undefined ||
          this.toNumber(row?.idsucursal) === 0,
      ) ||
      null
    );
  }

  private async notaCreditoExiste(ncNumero: string): Promise<boolean> {
    const codigo = String(ncNumero || '').trim();
    if (!codigo) return false;
    const { data, error } = await this.db
      .from('nota_credito')
      .select('nc_numero')
      .eq('nc_numero', codigo)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  }

  reservarNumero(): Observable<any> {
    return from((async () => {
      const tenant = this.tenant();
      if (!Number.isFinite(tenant.codsucu) || tenant.codsucu <= 0) {
        throw new Error('Sucursal invalida para generar el numero de nota de credito.');
      }

      const contRow = await this.getOrPickContFacturaRow(tenant.codsucu);
      if (!contRow) {
        throw new Error(`No existe contfactura para la sucursal ${tenant.codsucu}.`);
      }
      if (!Object.prototype.hasOwnProperty.call(contRow || {}, 'contnotacredito')) {
        throw new Error('El registro de contfactura no tiene el campo contnotacredito. Ejecute create_nota_credito.sql.');
      }

      const idField = this.contfacturaIdField(contRow);
      const contId = this.toNumberOrNull(
        contRow?.id ?? contRow?.cod ?? contRow?.idcontfact ?? contRow?.idContFact,
      );
      if (!idField || !contId) {
        throw new Error('contfactura sin id.');
      }

      const ano = this.toNumber(contRow?.ano) || new Date().getFullYear();
      const contActual = this.toNumber(contRow?.contnotacredito);

      for (let step = 1; step <= 50; step += 1) {
        const next = contActual + step;
        const codigo = this.buildNotaCreditoCode(ano, tenant.codsucu, next);
        if (await this.notaCreditoExiste(codigo)) continue;

        const { error: updateError } = await this.db
          .from('contfactura')
          .update({ contnotacredito: next })
          .eq(idField, contId);
        if (updateError) throw updateError;

        return codigo;
      }

      throw new Error('No se pudo generar un numero de nota de credito disponible desde contfactura.');
    })()).pipe(
      map((numero) => ({
        status: 'success',
        code: 200,
        message: 'Numero de nota de credito reservado',
        data: { numero },
      })),
    );
  }

  listar(filtro = '', limit = 100): Observable<any> {
    return from((async () => {
      const tenant = this.tenant();
      let query = this.db
        .from('nota_credito')
        .select('*')
        .eq('fa_codempr', tenant.codempr)
        .eq('fa_codsucu', tenant.codsucu)
        .order('nc_fecha', { ascending: false })
        .order('nc_numero', { ascending: false })
        .limit(Math.max(1, Math.min(Number(limit) || 100, 500)));

      const termino = String(filtro || '').trim();
      if (termino) {
        query = query.or(
          `nc_numero.ilike.%${termino}%,nc_factura.ilike.%${termino}%,nc_encf.ilike.%${termino}%,comprador_nombre.ilike.%${termino}%`,
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    })()).pipe(
      map((data) => ({ status: 'success', code: 200, data })),
    );
  }

  consultar(ncNumero: string): Observable<any> {
    return from((async () => {
      const tenant = this.tenant();
      const numero = String(ncNumero || '').trim();
      const [{ data: header, error: headerError }, { data: lines, error: linesError }] = await Promise.all([
        this.db
          .from('nota_credito')
          .select('*')
          .eq('nc_numero', numero)
          .eq('fa_codempr', tenant.codempr)
          .eq('fa_codsucu', tenant.codsucu)
          .maybeSingle(),
        this.db
          .from('det_nota_credito')
          .select('*')
          .eq('nc_numero', numero)
          .order('linea', { ascending: true }),
      ]);
      if (headerError) throw headerError;
      if (linesError) throw linesError;
      return header ? { header, lines: lines || [] } : null;
    })()).pipe(
      map((data) => ({ status: 'success', code: 200, data })),
    );
  }

  guardar(payload: NotaCreditoPayload): Observable<any> {
    return from((async () => {
      const tenant = this.tenant();
      if (!tenant.codempr || !Number.isFinite(tenant.codsucu) || tenant.codsucu <= 0) {
        throw new Error('No hay empresa o sucursal activa para guardar la nota de credito.');
      }

      const header = {
        ...(payload.header || {}),
        fa_codempr: tenant.codempr,
        fa_codsucu: tenant.codsucu,
        usuario: tenant.usuario || payload.header?.['usuario'] || null,
        updated_at: new Date().toISOString(),
      } as Record<string, any>;
      const ncNumero = String(header['nc_numero'] || '').trim();
      if (!ncNumero) {
        throw new Error('Debe indicar el numero de nota de credito.');
      }

      const { data: savedHeader, error: headerError } = await this.db
        .from('nota_credito')
        .upsert(header, { onConflict: 'nc_numero' })
        .select('*')
        .single();
      if (headerError) throw headerError;

      const deleteQuery = await this.db
        .from('det_nota_credito')
        .delete()
        .eq('nc_numero', ncNumero);
      if (deleteQuery.error) throw deleteQuery.error;

      const lines = (payload.lines || []).map((line, index) => ({
        nc_numero: ncNumero,
        linea: Number(line['linea'] ?? index + 1),
        descripcion: String(line['descripcion'] || '').trim(),
        cantidad: Number(line['cantidad'] || 0),
        precio: Number(line['precio'] || 0),
        descuento: Number(line['descuento'] || 0),
        itbis_porcentaje: Number(line['itbis_porcentaje'] || 0),
        monto: Number(line['monto'] || 0),
        itbis_monto: Number(line['itbis_monto'] || 0),
        total: Number(line['total'] || 0),
      })).filter((line) => line.descripcion);

      if (lines.length) {
        const { error: linesError } = await this.db
          .from('det_nota_credito')
          .insert(lines);
        if (linesError) throw linesError;
      }

      return { header: savedHeader, lines };
    })()).pipe(
      map((data) => ({
        status: 'success',
        code: 200,
        message: 'Nota de credito guardada',
        data,
      })),
    );
  }
}
