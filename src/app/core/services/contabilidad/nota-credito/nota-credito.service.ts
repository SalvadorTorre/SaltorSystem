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

  eliminarEncfRechazado(ncNumero: string): Observable<any> {
    return from((async () => {
      const tenant = this.tenant();
      const numero = String(ncNumero || '').trim();
      if (!numero) throw new Error('Numero de nota de credito requerido.');

      let consulta = this.db
        .from('nota_credito')
        .select('nc_numero,nc_encf,estado_dgii')
        .eq('nc_numero', numero)
        .eq('fa_codempr', tenant.codempr)
        .eq('fa_codsucu', tenant.codsucu);
      const { data: nota, error: consultaError } = await consulta.maybeSingle();
      if (consultaError) throw consultaError;
      if (!nota) throw new Error(`No se encontro la nota de credito ${numero}.`);

      const estado = String(nota?.estado_dgii || '').trim().toLowerCase();
      if (!estado.includes('rechaz') && !estado.includes('error')) {
        throw new Error('Solo se puede eliminar el e-NCF de una nota rechazada por DGII.');
      }

      const { data, error } = await this.db
        .from('nota_credito')
        .update({ nc_encf: null, updated_at: new Date().toISOString() })
        .eq('nc_numero', numero)
        .eq('fa_codempr', tenant.codempr)
        .eq('fa_codsucu', tenant.codsucu)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error(`No se pudo actualizar la nota de credito ${numero}.`);
      return data;
    })()).pipe(
      map((data) => ({ status: 'success', code: 200, data })),
    );
  }

  /**
   * Notas de credito (E34) para el Rep. 607, con los mismos nombres de campo
   * que usan las facturas en esa pantalla (fa_codFact, fa_ncfFact, ...).
   */
  listarParaReporte607(filtros: {
    fecha?: string | null;
    fechaDesde?: string | null;
    fechaHasta?: string | null;
    estadoDgii?: string | null;
    search?: string | null;
    empresa?: string | null;
    sucursal?: number | string | null;
  } = {}): Observable<any[]> {
    return from((async () => {
      const filas: any[] = [];
      const lote = 1000;
      for (let desde = 0; ; desde += lote) {
        let query = this.db
          .from('nota_credito')
          .select(
            'nc_numero,nc_factura,nc_encf,nc_fecha,nc_ncf_modificado,nc_tipo_pago,' +
            'comprador_rnc,comprador_nombre,subtotal,itbis_total,total,estado_dgii,' +
            'track_id,codigo_seguridad,qr_link,response_json,fa_codempr,fa_codsucu,updated_at',
          )
          .not('nc_encf', 'is', null)
          .order('nc_fecha', { ascending: false })
          .order('nc_numero', { ascending: false })
          .range(desde, desde + lote - 1);

        const fecha = String(filtros.fecha || '').trim();
        const fechaDesde = String(filtros.fechaDesde || '').trim();
        const fechaHasta = String(filtros.fechaHasta || '').trim();
        if (fecha) {
          query = query.eq('nc_fecha', fecha);
        } else {
          if (fechaDesde) query = query.gte('nc_fecha', fechaDesde);
          if (fechaHasta) query = query.lte('nc_fecha', fechaHasta);
        }

        const estado = String(filtros.estadoDgii || '').trim();
        if (estado) query = query.ilike('estado_dgii', `%${estado}%`);

        const search = String(filtros.search || '').trim().replace(/[,()%]/g, '');
        if (search) {
          query = query.or(`nc_numero.ilike.%${search}%,nc_encf.ilike.%${search}%,nc_factura.ilike.%${search}%`);
        }

        const empresa = String(filtros.empresa || '').trim();
        if (empresa) {
          query = query.eq('fa_codempr', empresa);
        } else {
          const tenant = this.tenant();
          if (tenant.codempr) query = query.eq('fa_codempr', tenant.codempr);
        }
        const sucursal = Number(filtros.sucursal);
        if (Number.isFinite(sucursal) && sucursal > 0) query = query.eq('fa_codsucu', sucursal);

        const { data, error } = await query;
        if (error) throw error;
        const pagina = data || [];
        filas.push(...pagina);
        if (pagina.length < lote) break;
      }

      return filas.map((nc: any) => ({
        esNotaCredito: true,
        fa_codFact: nc.nc_numero,
        fa_codfact: nc.nc_numero,
        fa_codEmpr: nc.fa_codempr,
        fa_codempr: nc.fa_codempr,
        fa_codSucu: nc.fa_codsucu,
        fa_codsucu: nc.fa_codsucu,
        fa_tipoNcf: '34',
        fa_tiponcf: '34',
        fa_ncfFact: nc.nc_encf,
        fa_ncffact: nc.nc_encf,
        fa_fecNcf: nc.nc_fecha,
        fa_fecncf: nc.nc_fecha,
        fa_fecFact: nc.nc_fecha,
        fa_nomClie: nc.comprador_nombre,
        fa_rncFact: nc.comprador_rnc,
        fa_valFact: this.toNumber(nc.total),
        fa_itbiFact: this.toNumber(nc.itbis_total),
        fa_subFact: this.toNumber(nc.subtotal),
        encf_modificado: nc.nc_ncf_modificado,
        factura_afectada: nc.nc_factura,
        estado_dgii: nc.estado_dgii,
        codseguridad: nc.codigo_seguridad,
        qr_link: nc.qr_link,
        dgii_track_id: nc.track_id,
        dgii_response_json: nc.response_json,
        dgii_updated_at: nc.updated_at,
      }));
    })());
  }

  /** Fecha local (YYYY-MM-DD) de hoy mas `dias` dias. */
  private fechaMasDias(dias: number): string {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  guardar(payload: NotaCreditoPayload): Observable<any> {
    return from((async () => {
      const tenant = this.tenant();
      if (!tenant.codempr || !Number.isFinite(tenant.codsucu) || tenant.codsucu <= 0) {
        throw new Error('No hay empresa o sucursal activa para guardar la nota de credito.');
      }

      const header = {
        ...(payload.header || {}),
        nc_tipo_pago: Number(payload.header?.['nc_tipo_pago']) === 2 ? 2 : 1,
        fa_codempr: tenant.codempr,
        fa_codsucu: tenant.codsucu,
        usuario: tenant.usuario || payload.header?.['usuario'] || null,
        updated_at: new Date().toISOString(),
      } as Record<string, any>;
      const ncNumero = String(header['nc_numero'] || '').trim();
      if (!ncNumero) {
        throw new Error('Debe indicar el numero de nota de credito.');
      }
      const ncFactura = String(header['nc_factura'] || '').trim();
      if (!ncFactura) {
        throw new Error('Debe indicar la factura afectada por la nota de credito.');
      }
      const valorNotaCredito = this.toNumber(header['total']);
      if (valorNotaCredito <= 0) {
        throw new Error('El valor de la nota de credito debe ser mayor que cero.');
      }

      const { data: notaExistente, error: estadoError } = await this.db
        .from('nota_credito')
        .select('nc_numero,nc_factura,estado_dgii,nc_vencimiento')
        .eq('nc_numero', ncNumero)
        .eq('fa_codempr', tenant.codempr)
        .eq('fa_codsucu', tenant.codsucu)
        .maybeSingle();
      if (estadoError) throw estadoError;
      const estadoActual = String(notaExistente?.estado_dgii || '').trim().toLowerCase();
      if (estadoActual.includes('acept')) {
        throw new Error(`La nota de credito ${ncNumero} ya fue aceptada por la DGII y no puede modificarse.`);
      }

      // Vencimiento: 30 dias despues de la fecha en que se guarda la nota por primera vez.
      // Si la nota ya existe y tiene vencimiento, se conserva para que no cambie en cada guardado.
      header['nc_vencimiento'] = notaExistente?.nc_vencimiento || this.fechaMasDias(30);

      const facturaAnterior = String(notaExistente?.nc_factura || '').trim();
      const esMismaNotaDeFactura = !!notaExistente && facturaAnterior === ncFactura;
      const { data: factura, error: facturaError } = await this.db
        .from('factura')
        .select('fa_codfact,fa_valnotacredit')
        .eq('fa_codfact', ncFactura)
        .eq('fa_codempr', tenant.codempr)
        .eq('fa_codsucu', tenant.codsucu)
        .maybeSingle();
      if (facturaError) throw facturaError;
      if (!factura) {
        throw new Error(`No se encontro la factura ${ncFactura} en la empresa y sucursal activas.`);
      }

      const valorNotaAnterior = this.toNumber(factura.fa_valnotacredit);
      if (!esMismaNotaDeFactura && valorNotaAnterior > 0) {
        throw new Error(`La factura ${ncFactura} ya tiene una nota de credito realizada.`);
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

      const { data: facturaActualizada, error: actualizarFacturaError } = await this.db
        .from('factura')
        .update({ fa_valnotacredit: valorNotaCredito })
        .eq('fa_codfact', ncFactura)
        .eq('fa_codempr', tenant.codempr)
        .eq('fa_codsucu', tenant.codsucu)
        .select('fa_codfact')
        .maybeSingle();
      if (actualizarFacturaError) throw actualizarFacturaError;
      if (!facturaActualizada) {
        throw new Error(`No se pudo registrar el valor de la nota de credito en la factura ${ncFactura}.`);
      }

      if (facturaAnterior && facturaAnterior !== ncFactura) {
        const { error: limpiarFacturaAnteriorError } = await this.db
          .from('factura')
          .update({ fa_valnotacredit: 0 })
          .eq('fa_codfact', facturaAnterior)
          .eq('fa_codempr', tenant.codempr)
          .eq('fa_codsucu', tenant.codsucu);
        if (limpiarFacturaAnteriorError) throw limpiarFacturaAnteriorError;
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
