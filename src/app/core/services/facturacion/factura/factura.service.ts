import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { HttpInvokeService } from '../../http-invoke.service';
import { SupabaseService } from '../../supabase/supabase.service';

interface EncfReservation {
  encfId: number;
  codempr: string;
  tipoencf: string;
  tipoNumero: number | null;
  ncf: string;
  oldCount: number;
  newCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class ServicioFacturacion {
  constructor(
    private http: HttpInvokeService,
    private supabase: SupabaseService
  ) {}

  private get useSupabase(): boolean {
    return !!this.supabase.enabled && !!this.supabase.client;
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

  private toNumberOrNull(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private toStringOrNull(value: any): string | null {
    if (value === null || value === undefined) return null;
    const s = String(value).trim();
    return s ? s : null;
  }

  private toStringMax(value: any, max: number): string | null {
    const s = this.toStringOrNull(value);
    if (!s) return null;
    return s.length > max ? s.slice(0, max) : s;
  }

  private normalizeDate(input: any): string | null {
    if (!input) return null;
    if (input instanceof Date && !isNaN(input.getTime())) {
      const y = input.getFullYear();
      const m = String(input.getMonth() + 1).padStart(2, '0');
      const d = String(input.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const s = String(input).trim();
    const ddmmyyyy = s.match(/^([0-3]?\d)\/([0-1]?\d)\/(\d{4})$/);
    if (ddmmyyyy) {
      const d = ddmmyyyy[1].padStart(2, '0');
      const m = ddmmyyyy[2].padStart(2, '0');
      const y = ddmmyyyy[3];
      return `${y}-${m}-${d}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return null;
  }

  private currentTenant(): {
    role: string;
    codEmpre: string;
    sucursal: number;
    rncEmpre: string;
  } {
    const role = String(localStorage.getItem('role') || '').toLowerCase();
    const empresaRaw = localStorage.getItem('empresa');
    let empresaObj: any = null;
    try {
      empresaObj = empresaRaw ? JSON.parse(empresaRaw) : null;
    } catch {
      empresaObj = null;
    }

    const codEmpre = String(
      localStorage.getItem('codigoempresa') ||
      localStorage.getItem('cod_empre') ||
      empresaObj?.cod_empre ||
      ''
    ).trim();
    const rncEmpre = String(
      localStorage.getItem('rnc_empresa') ||
      empresaObj?.rnc_empre ||
      ''
    ).trim();
    const sucursal = Number(localStorage.getItem('idSucursal') || 0);
    return { role, codEmpre, sucursal, rncEmpre };
  }

  private applyTenantFilter(query: any): any {
    const { role, codEmpre, sucursal, rncEmpre } = this.currentTenant();
    let scoped = query;
    if (codEmpre) {
      scoped = scoped.eq('fa_codempr', codEmpre);
    } else if (rncEmpre) {
      scoped = scoped.eq('tenant_rnc', rncEmpre);
    } else {
      // Failsafe: sin tenant activo no devolvemos ni tocamos facturas.
      scoped = scoped.eq('fa_codempr', '__NO_TENANT__');
    }
    if (role === 'vendedor' && Number.isFinite(sucursal) && sucursal > 0) {
      scoped = scoped.eq('fa_codsucu', sucursal);
    }
    return scoped;
  }

  private applyTenantFilterDetalle(query: any): any {
    const { role, codEmpre, sucursal, rncEmpre } = this.currentTenant();
    let scoped = query;
    if (codEmpre) {
      scoped = scoped.eq('df_codepr', codEmpre);
    } else if (rncEmpre) {
      scoped = scoped.eq('tenant_rnc', rncEmpre);
    } else {
      scoped = scoped.eq('df_codepr', '__NO_TENANT__');
    }
    if (role === 'vendedor' && Number.isFinite(sucursal) && sucursal > 0) {
      scoped = scoped.eq('df_codsucu', String(sucursal));
    }
    return scoped;
  }

  private async ensureTenantCodEmpre(): Promise<string> {
    const tenant = this.currentTenant();
    if (tenant.codEmpre) return tenant.codEmpre;
    if (!tenant.rncEmpre) return '';

    const { data, error } = await this.db
      .from('empresas')
      .select('cod_empre')
      .eq('rnc_empre', tenant.rncEmpre)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return String(data?.cod_empre || '').trim();
  }

  private async facturaExisteEnTenant(codFact: string): Promise<boolean> {
    const codigo = String(codFact || '').trim();
    if (!codigo) return false;

    let query = this.db
      .from('factura')
      .select('fa_codfact')
      .eq('fa_codfact', codigo)
      .limit(1);
    query = this.applyTenantFilter(query);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return !!data;
  }

  private async recalcularPendienteFactura(codFact: string): Promise<void> {
    const codigo = String(codFact || '').trim();
    if (!codigo) return;

    let detalleQuery = this.db
      .from('detfactura')
      .select('df_canpend,df_pendiente')
      .eq('df_codfact', codigo);
    detalleQuery = this.applyTenantFilterDetalle(detalleQuery);
    const { data: detalles, error: detalleError } = await detalleQuery;
    if (detalleError) throw detalleError;

    const hayPendiente = (detalles || []).some((d: any) => {
      const canpend = this.toNumber(d?.df_canpend);
      const flag = String(d?.df_pendiente || '').toUpperCase();
      return canpend > 0 || flag === 'P';
    });

    let facturaUpdate = this.db
      .from('factura')
      .update({ fa_pendiente: hayPendiente ? 'P' : 'N' })
      .eq('fa_codfact', codigo)
      .select('fa_codfact');
    facturaUpdate = this.applyTenantFilter(facturaUpdate);
    const { error: facturaError } = await facturaUpdate.maybeSingle();
    if (facturaError) throw facturaError;
  }

  private async descontarInventarioFactura(
    detalle: any[],
    idsucursal: number,
  ): Promise<void> {
    if (!Number.isFinite(idsucursal) || idsucursal <= 0) {
      throw new Error('Sucursal invalida para descontar inventario.');
    }

    for (const item of detalle) {
      const producto = item?.producto || {};
      const codProducto = String(
        producto?.in_codmerc ?? item?.df_codMerc ?? item?.df_codmerc ?? '',
      ).trim();
      const cantidad = this.toNumber(
        item?.cantidad ?? item?.df_canMerc ?? item?.df_canmerc,
      );
      if (!codProducto || cantidad <= 0) continue;

      const { data: inventario, error: inventarioError } = await this.db
        .from('inventario')
        .select('*')
        .eq('inv_codsucu', idsucursal)
        .eq('inv_codprod', codProducto)
        .limit(1)
        .maybeSingle();
      if (inventarioError) throw inventarioError;
      if (!inventario) continue;

      const existenciaNueva = this.toNumber(inventario?.inv_existencia) - cantidad;
      const { error: updateError } = await this.db
        .from('inventario')
        .update({
          inv_existencia: existenciaNueva,
          inv_fechamov: new Date().toISOString(),
        })
        .eq('id', Number(inventario.id))
        .eq('inv_codsucu', idsucursal)
        .eq('inv_codprod', codProducto);
      if (updateError) throw updateError;
    }
  }

  private mapFacturaDbToUi(row: any): any {
    if (!row) return row;
    return {
      ...row,
      fa_codFact: row.fa_codfact ?? row.fa_codFact ?? '',
      fa_ncfFact: row.fa_ncffact ?? row.fa_ncfFact ?? '',
      fa_rncFact: row.fa_rncfact ?? row.fa_rncFact ?? '',
      fa_fecNcf: row.fa_fecncf ?? row.fa_fecNcf ?? null,
      fa_tipoNcf: row.fa_tiponcf ?? row.fa_tipoNcf ?? null,
      fa_tipoitbis: row.fa_tipoitbis ?? row.fa_tipoitbis ?? '',
      fa_fecFact: row.fa_fecfact ?? row.fa_fecFact ?? null,
      fa_fecHora: row.fa_fechora ?? row.fa_fecHora ?? null,
      fa_fehora: row.fa_fehora ?? row.fa_fehora ?? null,
      fa_valFact: this.toNumber(row.fa_valfact ?? row.fa_valFact),
      fa_itbiFact: this.toNumber(row.fa_itbifact ?? row.fa_itbiFact),
      fa_subFact: this.toNumber(row.fa_subfact ?? row.fa_subFact),
      fa_desFact: this.toNumber(row.fa_desfact ?? row.fa_desFact),
      fa_cosFact: this.toNumber(row.fa_cosfact ?? row.fa_cosFact),
      fa_aboFact: this.toNumber(row.fa_abofact ?? row.fa_aboFact),
      fa_expFact: row.fa_expfact ?? row.fa_expFact ?? null,
      fa_codClie: row.fa_codclie ?? row.fa_codClie ?? null,
      fa_nomClie: row.fa_nomclie ?? row.fa_nomClie ?? '',
      fa_telClie: row.fa_telclie ?? row.fa_telClie ?? '',
      fa_dirClie: row.fa_dirclie ?? row.fa_dirClie ?? '',
      fa_contacto: row.fa_contacto ?? '',
      fa_codZona: row.fa_codzona ?? row.fa_codZona ?? null,
      fa_desZona: row.fa_deszona ?? row.fa_desZona ?? '',
      fa_codSect: row.fa_codsect ?? row.fa_codSect ?? null,
      fa_sector: row.fa_sector ?? '',
      fa_codVend: row.fa_codvend ?? row.fa_codVend ?? '',
      fa_nomVend: row.fa_nomvend ?? row.fa_nomVend ?? '',
      fa_notaFact: row.fa_notafact ?? row.fa_notaFact ?? '',
      fa_usuario: row.fa_usuario ?? '',
      fa_envio: row.fa_envio ?? null,
      fa_fpago: row.fa_fpago ?? '',
      fa_codfpago: row.fa_codfpago ?? null,
      fa_origenpago: row.fa_origenpago ?? '',
      fa_confirpago: row.fa_confirpago ?? '',
      fa_notapago: row.fa_notapago ?? '',
      fa_status: row.fa_status ?? '',
      fa_tipoFact: row.fa_tipofact ?? row.fa_tipoFact ?? null,
      fa_imp: row.fa_imp ?? '',
      fa_tipoRnc: row.fa_tipornc ?? row.fa_tipoRnc ?? null,
      fa_fecha: row.fa_fecha ?? '',
      fa_codSucu: row.fa_codsucu ?? row.fa_codSucu ?? null,
      fa_correo: row.fa_correo ?? '',
      fa_codEmpr: row.fa_codempr ?? row.fa_codEmpr ?? '',
      fa_impresa: row.fa_impresa ?? '',
      fa_reimpresa: row.fa_reimpresa ?? '',
      fa_entrega: row.fa_entrega ?? '',
      fa_impalmaf: row.fa_impalmaf ?? '',
      fa_impalmap: row.fa_impalmap ?? '',
      fa_facturada: row.fa_facturada ?? '',
      fa_pendiente: row.fa_pendiente ?? '',
      fa_despacho: row.fa_despacho ?? '',
      estado_dgii: row.estado_dgii ?? '',
      codseguridad: row.codseguridad ?? '',
      qr_link: row.qr_link ?? '',
      fec_firma: row.fec_firma ?? '',
      ecf: row.ecf ?? '',
      rfce: row.rfce ?? '',
      estado_envio_dgii: row.estado_envio_dgii ?? '',
      fa_cierre: row.fa_cierre ?? '',
      fa_salida: row.fa_salida ?? '',
      idsalida: row.idsalida ?? null,
    };
  }

  private mapDetalleDbToUi(row: any): any {
    if (!row) return row;
    return {
      ...row,
      df_codFact: row.df_codfact ?? row.df_codFact ?? '',
      df_fecFact: row.df_fecfact ?? row.df_fecFact ?? null,
      df_codMerc: row.df_codmerc ?? row.df_codMerc ?? '',
      df_tipoMerc: row.df_tipomerc ?? row.df_tipoMerc ?? '',
      df_codGrupo: row.df_codgrupo ?? row.df_codGrupo ?? '',
      df_desMerc: row.df_desmerc ?? row.df_desMerc ?? '',
      df_canMerc: this.toNumber(row.df_canmerc ?? row.df_canMerc),
      df_preMerc: this.toNumber(row.df_premerc ?? row.df_preMerc),
      df_valMerc: this.toNumber(row.df_valmerc ?? row.df_valMerc),
      df_unidad: row.df_unidad ?? '',
      df_cosMerc: this.toNumber(row.df_cosmerc ?? row.df_cosMerc),
      df_codClie: row.df_codclie ?? row.df_codClie ?? null,
      df_imp: row.df_imp ?? '',
      df_status: row.df_status ?? '',
      enviado: row.enviado ?? null,
      reimpresa: row.reimpresa ?? null,
      df_nomClie: row.df_nomclie ?? row.df_nomClie ?? '',
      df_codEpr: row.df_codepr ?? row.df_codEpr ?? '',
      df_codSucu: row.df_codsucu ?? row.df_codSucu ?? '',
      df_pendiente: row.df_pendiente ?? '',
      df_canpend: this.toNumber(row.df_canpend ?? row.df_canpend),
    };
  }

  private mapFacturaUiToDb(input: any): any {
    const payload: any = {
      fa_codfact: this.toStringMax(input?.fa_codFact, 12),
      fa_ncffact: this.toStringMax(input?.fa_ncfFact, 19),
      fa_rncfact: this.toStringMax(input?.fa_rncFact, 13),
      fa_fecncf: this.normalizeDate(input?.fa_fecNcf),
      fa_tiponcf: this.toNumberOrNull(input?.fa_tipoNcf),
      fa_tipoitbis: this.toStringMax(input?.fa_tipoitbis, 20),
      fa_fecfact: this.normalizeDate(input?.fa_fecFact),
      fa_fechora: input?.fa_fecHora || null,
      fa_fehora: input?.fa_fehora || new Date().toISOString(),
      fa_valfact: this.toNumberOrNull(input?.fa_valFact),
      fa_itbifact: this.toNumberOrNull(input?.fa_itbiFact),
      fa_subfact: this.toNumberOrNull(input?.fa_subFact),
      fa_desfact: this.toNumberOrNull(input?.fa_desFact),
      fa_cosfact: this.toNumberOrNull(input?.fa_cosFact),
      fa_abofact: this.toNumberOrNull(input?.fa_aboFact),
      fa_expfact: this.normalizeDate(input?.fa_expFact),
      fa_codclie: this.toNumberOrNull(input?.fa_codClie),
      fa_nomclie: this.toStringMax(input?.fa_nomClie, 39),
      fa_telclie: this.toStringMax(input?.fa_telClie, 26),
      fa_dirclie: this.toStringMax(input?.fa_dirClie, 40),
      fa_contacto: this.toStringMax(input?.fa_contacto, 30),
      fa_codzona: this.toNumberOrNull(input?.fa_codZona),
      fa_deszona: this.toStringMax(input?.fa_desZona, 25),
      fa_codsect: this.toNumberOrNull(input?.fa_codSect),
      fa_sector: this.toStringMax(input?.fa_sector, 35),
      fa_codvend: this.toStringMax(input?.fa_codVend, 10),
      fa_nomvend: this.toStringMax(input?.fa_nomVend, 15),
      fa_notafact: this.toStringOrNull(input?.fa_notaFact),
      fa_usuario: this.toStringMax(input?.fa_usuario, 30),
      fa_envio: this.toNumberOrNull(input?.fa_envio),
      fa_fpago: this.toStringMax(input?.fa_fpago, 20),
      fa_codfpago: this.toNumberOrNull(input?.fa_codfpago),
      fa_origenpago: this.toStringMax(input?.fa_origenpago, 30),
      fa_confirpago: this.toStringMax(input?.fa_confirpago, 50),
      fa_notapago: this.toStringOrNull(input?.fa_notapago),
      fa_status: this.toStringMax(input?.fa_status, 3),
      fa_tipofact: this.toNumberOrNull(input?.fa_tipoFact),
      fa_imp: this.toStringMax(input?.fa_imp, 1),
      fa_tipornc: this.toNumberOrNull(input?.fa_tipoRnc),
      fa_fecha: this.toStringMax(input?.fa_fecha, 8),
      fa_codsucu: this.toNumberOrNull(input?.fa_codSucu),
      fa_correo: this.toStringMax(input?.fa_correo, 30),
      fa_codempr: this.toStringMax(input?.fa_codEmpr, 6),
      fa_impresa: this.toStringMax(input?.fa_impresa, 1),
      fa_reimpresa: this.toStringMax(input?.fa_reimpresa, 1),
      fa_entrega: this.toStringMax(input?.fa_entrega, 1),
      fa_impalmaf: this.toStringMax(input?.fa_impalmaf, 1),
      fa_impalmap: this.toStringMax(input?.fa_impalmap, 1),
      fa_facturada: this.toStringMax(input?.fa_facturada, 1),
      fa_pendiente: this.toStringMax(input?.fa_pendiente, 1),
      fa_despacho: this.toStringMax(input?.fa_despacho, 1),
      estado_dgii: this.toStringOrNull(input?.estado_dgii),
      codseguridad: this.toStringOrNull(input?.codseguridad),
      qr_link: this.toStringOrNull(input?.qr_link),
      fec_firma: this.toStringOrNull(input?.fec_firma),
      ecf: this.toStringOrNull(input?.ecf),
      rfce: this.toStringOrNull(input?.rfce),
      estado_envio_dgii: this.toStringMax(input?.estado_envio_dgii, 50),
      fa_cierre: this.toStringMax(input?.fa_cierre, 20),
      fa_salida: this.toStringMax(input?.fa_salida, 1),
      idsalida: this.toStringOrNull(input?.idsalida),
    };

    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) {
        delete payload[k];
      }
    });

    return payload;
  }

  private async nextFacturaCode(): Promise<string> {
    const year = new Date().getFullYear();
    const { data: current, error: readError } = await this.db
      .from('ctr_factura')
      .select('year,last_number')
      .eq('year', year)
      .limit(1)
      .maybeSingle();

    if (readError) throw readError;

    const nextNumber = this.toNumber(current?.last_number) + 1;

    if (!current) {
      const { error: insertError } = await this.db
        .from('ctr_factura')
        .insert({ year, last_number: nextNumber })
        .select('year')
        .maybeSingle();
      if (insertError) throw insertError;
    } else {
      const { error: updateError } = await this.db
        .from('ctr_factura')
        .update({ last_number: nextNumber })
        .eq('year', year);
      if (updateError) throw updateError;
    }

    return `${year}${String(nextNumber).padStart(6, '0')}`;
  }

  private normalizeTipoEncfFromTipoNcf(tipoNcf: any): { tipoNumero: number | null; tipoencf: string } {
    const raw = String(tipoNcf ?? '').trim().toUpperCase();
    if (!raw) return { tipoNumero: null, tipoencf: '' };

    if (/^[A-Z]\d{1,3}$/.test(raw)) {
      const tipoNumero = this.toNumberOrNull(raw.slice(1));
      if (tipoNumero !== null) {
        return {
          tipoNumero,
          tipoencf: `${raw[0]}${String(tipoNumero).padStart(2, '0')}`,
        };
      }
    }

    const tipoNumero = this.toNumberOrNull(raw);
    if (tipoNumero !== null && tipoNumero > 0) {
      const prefijo = tipoNumero >= 31 ? 'E' : 'B';
      return {
        tipoNumero,
        tipoencf: `${prefijo}${String(tipoNumero).padStart(2, '0')}`,
      };
    }

    return { tipoNumero: null, tipoencf: raw };
  }

  private buildEncfNumber(tipoencf: string, secuencia: number): string {
    const prefijo = String(tipoencf || '').trim().toUpperCase();
    const correlativo = Math.max(1, Math.trunc(Number(secuencia) || 1));
    return `${prefijo}${String(correlativo).padStart(10, '0')}`;
  }

  private async reserveNextEncf(codempr: string, tipoNcf: any): Promise<EncfReservation> {
    const codEmpresa = String(codempr || '').trim().toUpperCase();
    if (!codEmpresa) {
      throw new Error('No hay empresa activa para asignar ENCF.');
    }

    const { tipoNumero, tipoencf } = this.normalizeTipoEncfFromTipoNcf(tipoNcf);
    if (!tipoencf && tipoNumero === null) {
      throw new Error('Tipo de comprobante inválido para asignar ENCF.');
    }

    for (let intento = 0; intento < 5; intento++) {
      let queryByTipo = this.db
        .from('encf')
        .select('id,codempr,tipo,tipoencf,desdeencf,hastaencf,cantencf,countencf')
        .eq('codempr', codEmpresa)
        .order('id', { ascending: false })
        .limit(1);

      if (tipoNumero !== null) {
        queryByTipo = queryByTipo.eq('tipo', tipoNumero);
      } else {
        queryByTipo = queryByTipo.eq('tipoencf', tipoencf);
      }

      const { data: byTipo, error: byTipoError } = await queryByTipo.maybeSingle();
      if (byTipoError) throw byTipoError;

      let encfRow = byTipo;
      if (!encfRow && tipoencf) {
        const { data: byText, error: byTextError } = await this.db
          .from('encf')
          .select('id,codempr,tipo,tipoencf,desdeencf,hastaencf,cantencf,countencf')
          .eq('codempr', codEmpresa)
          .eq('tipoencf', tipoencf)
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (byTextError) throw byTextError;
        encfRow = byText;
      }

      if (!encfRow) {
        throw new Error(`No hay secuencia ENCF configurada para ${codEmpresa} (${tipoencf || tipoNumero}).`);
      }

      const desde = this.toNumber(encfRow?.desdeencf);
      const base = desde > 0 ? desde : 1;
      const oldCount = Math.max(0, this.toNumber(encfRow?.countencf));
      const nextSecuencia = base + oldCount;
      const hasta = this.toNumber(encfRow?.hastaencf);
      const cant = this.toNumber(encfRow?.cantencf);

      if (hasta > 0 && nextSecuencia > hasta) {
        throw new Error(`La secuencia ${encfRow?.tipoencf || tipoencf} alcanzó su límite (${hasta}).`);
      }

      if (cant > 0 && oldCount >= cant) {
        throw new Error(`La secuencia ${encfRow?.tipoencf || tipoencf} no tiene disponibilidad.`);
      }

      const newCount = oldCount + 1;
      let updateQuery = this.db
        .from('encf')
        .update({ countencf: newCount })
        .eq('id', Number(encfRow?.id))
        .select('id,countencf');

      if (encfRow?.countencf === null || encfRow?.countencf === undefined || encfRow?.countencf === '') {
        updateQuery = updateQuery.is('countencf', null);
      } else {
        updateQuery = updateQuery.eq('countencf', oldCount);
      }

      const { data: updated, error: updateError } = await updateQuery.maybeSingle();
      if (updateError) throw updateError;
      if (!updated) continue;

      const tipoFinal = String(encfRow?.tipoencf || tipoencf || '').trim().toUpperCase();
      const ncf = this.buildEncfNumber(tipoFinal, nextSecuencia);
      return {
        encfId: Number(encfRow?.id),
        codempr: codEmpresa,
        tipoencf: tipoFinal,
        tipoNumero: this.toNumberOrNull(encfRow?.tipo) ?? tipoNumero,
        ncf,
        oldCount,
        newCount,
      };
    }

    throw new Error('No se pudo reservar la secuencia ENCF. Intenta nuevamente.');
  }

  private async rollbackEncfReservation(reservation: EncfReservation | null): Promise<void> {
    if (!reservation) return;
    try {
      await this.db
        .from('encf')
        .update({ countencf: reservation.oldCount })
        .eq('id', reservation.encfId)
        .eq('countencf', reservation.newCount);
    } catch {
      // Best-effort rollback.
    }
  }

  asignarEncfFactura(fa_codFact: string): Observable<any> {
    if (!this.useSupabase) {
      return this.http.PatchRequest(
        `/facturacion/asignar-encf/${fa_codFact}`,
        {},
      );
    }

    const codigo = String(fa_codFact || '').trim();
    return from((async () => {
      if (!codigo) {
        throw new Error('Debe indicar la factura para generar el ENCF.');
      }

      let facturaQuery = this.db
        .from('factura')
        .select('*')
        .eq('fa_codfact', codigo)
        .limit(1);
      facturaQuery = this.applyTenantFilter(facturaQuery);
      const { data: factura, error: facturaError } = await facturaQuery.maybeSingle();
      if (facturaError) throw facturaError;
      if (!factura) {
        throw new Error(`Factura ${codigo} no pertenece al tenant activo.`);
      }

      const encfActual = String(factura?.fa_ncffact || '').trim();
      if (encfActual) {
        return {
          status: 'success',
          code: 200,
          data: this.mapFacturaDbToUi(factura),
        };
      }

      const codEmpresa = String(
        factura?.fa_codempr || (await this.ensureTenantCodEmpre()) || '',
      ).trim();
      const tipoNcf = factura?.fa_tiponcf;
      if (!tipoNcf) {
        throw new Error('La factura no tiene tipo de comprobante para generar ENCF.');
      }

      let reservation: EncfReservation | null = null;
      try {
        reservation = await this.reserveNextEncf(codEmpresa, tipoNcf);
        const patch: any = {
          fa_ncffact: reservation.ncf,
          fa_fecncf: this.normalizeDate(new Date()),
        };

        let updateQuery = this.db
          .from('factura')
          .update(patch)
          .eq('fa_codfact', codigo)
          .select('*');
        updateQuery = this.applyTenantFilter(updateQuery);
        const { data: actualizada, error: updateError } = await updateQuery.maybeSingle();
        if (updateError) throw updateError;
        if (!actualizada) {
          throw new Error(`No se pudo actualizar el ENCF de la factura ${codigo}.`);
        }

        return {
          status: 'success',
          code: 200,
          data: this.mapFacturaDbToUi(actualizada),
        };
      } catch (error) {
        await this.rollbackEncfReservation(reservation);
        throw error;
      }
    })());
  }

  getByNumero(numero: string): Observable<any> {
    if (!this.useSupabase) {
      return this.http.GetRequest<any>(`/factura-numero/${numero}`, false);
    }

    const codigo = String(numero || '').trim();
    return from((async () => {
      let query = this.db.from('factura').select('*').eq('fa_codfact', codigo).limit(1);
      query = this.applyTenantFilter(query);
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      const mapped = data ? this.mapFacturaDbToUi(data) : null;
      return {
        ...(mapped || {}),
        status: mapped ? 'success' : 'not_found',
        code: mapped ? 200 : 404,
        data: mapped,
      };
    })());
  }

  marcarImpresa(
    numero: string,
    body: { fa_envio?: string; fa_fpago?: string; fa_codfpago?: string }
  ) {
    if (!this.useSupabase) {
      return this.http.PatchRequest(`/factura-impresa/${numero}`, body);
    }

    return from((async () => {
      const patch: any = {};
      if (body?.fa_envio !== undefined) patch.fa_envio = this.toNumberOrNull(body.fa_envio);
      if (body?.fa_fpago !== undefined) patch.fa_fpago = this.toStringOrNull(body.fa_fpago);
      if (body?.fa_codfpago !== undefined) patch.fa_codfpago = this.toNumberOrNull(body.fa_codfpago);
      patch.fa_impresa = 'S';

      let updateQuery = this.db
        .from('factura')
        .update(patch)
        .eq('fa_codfact', String(numero))
        .select('*');
      updateQuery = this.applyTenantFilter(updateQuery);
      const { data, error } = await updateQuery.maybeSingle();
      if (error) throw error;
      return { status: 'success', code: 200, data: this.mapFacturaDbToUi(data) };
    })());
  }

  guardarFacturacion(datosParaGuardar: any): Observable<any> {
    if (!this.useSupabase) {
      return this.http.PostRequest<any, any>('/facturacion', datosParaGuardar);
    }

    return from((async () => {
      try {
        const facturaRaw = { ...(datosParaGuardar?.factura || {}) };
        const detalleRaw = Array.isArray(datosParaGuardar?.detalle)
          ? datosParaGuardar.detalle
          : [];
        const tenantCodEmpre = await this.ensureTenantCodEmpre();
        const tenantSucursal = this.currentTenant().sucursal;
        if (!tenantCodEmpre) {
          throw new Error('No hay tenant activo para registrar facturas.');
        }

        let codigo = String(facturaRaw?.fa_codFact || '').trim();
        if (!codigo) {
          codigo = await this.nextFacturaCode();
        }

        facturaRaw.fa_codFact = codigo;
        facturaRaw.fa_codEmpr = tenantCodEmpre;
        if (Number.isFinite(tenantSucursal) && tenantSucursal > 0) {
          facturaRaw.fa_codSucu = tenantSucursal;
        }

        const facturaPayload = this.mapFacturaUiToDb(facturaRaw);
        facturaPayload.fa_codfact = codigo;
        facturaPayload.fa_codempr = tenantCodEmpre;
        facturaPayload.tenant_rnc = this.toStringOrNull(this.currentTenant().rncEmpre);
        if (Number.isFinite(tenantSucursal) && tenantSucursal > 0) {
          facturaPayload.fa_codsucu = tenantSucursal;
        }
        facturaPayload.fa_status = 'C';
        // Al grabar facturas: siempre quedan pendientes de pago
        // (la forma de pago vive en fa_codfpago; fa_fpago se usa como flag/estado).
        facturaPayload.fa_fpago = 'N';
        facturaPayload.fa_impresa = facturaPayload.fa_impresa || 'N';
        facturaPayload.fa_reimpresa = facturaPayload.fa_reimpresa || 'N';
        facturaPayload.fa_entrega = facturaPayload.fa_entrega || 'N';
        facturaPayload.fa_salida = facturaPayload.fa_salida || 'N';

        const { data: insertedFactura, error: facturaError } = await this.db
          .from('factura')
          .insert(facturaPayload)
          .select('*')
          .single();

        if (facturaError) throw facturaError;

        try {
          if (detalleRaw.length > 0) {
            const detallePayload = detalleRaw.map((item: any) => {
              const producto = item?.producto || {};
              const cantidad = this.toNumber(item?.cantidad ?? item?.df_canMerc);
              const precio = this.toNumber(item?.precio ?? item?.df_preMerc);
              const total = this.toNumber(item?.total ?? item?.df_valMerc) || cantidad * precio;

              return {
                df_codfact: this.toStringMax(codigo, 12) || '',
                df_fecfact: this.normalizeDate(facturaRaw?.fa_fecFact),
                df_codmerc: this.toStringMax(producto?.in_codmerc ?? item?.df_codMerc, 15) || '',
                df_tipomerc: this.toStringMax(item?.df_tipoMerc, 1),
                df_codgrupo: this.toStringMax(item?.df_codGrupo, 10),
                df_desmerc: this.toStringMax(producto?.in_desmerc ?? item?.df_desMerc, 30),
                df_canmerc: cantidad,
                df_premerc: precio,
                df_valmerc: total,
                df_unidad: this.toStringMax(producto?.in_unidad ?? item?.df_unidad, 8),
                df_cosmerc: this.toNumberOrNull(item?.costo ?? item?.df_cosMerc ?? producto?.in_cosmerc),
                df_codclie: this.toNumberOrNull(facturaRaw?.fa_codClie),
                df_imp: this.toStringMax(item?.df_imp, 1),
                df_status: this.toStringMax(item?.df_status, 3) || 'A',
                enviado: this.toNumberOrNull(item?.enviado),
                reimpresa: this.toNumberOrNull(item?.reimpresa),
                df_nomclie: this.toStringMax(facturaRaw?.fa_nomClie, 10),
                df_codepr: this.toStringMax(tenantCodEmpre, 6),
                tenant_rnc: this.toStringOrNull(this.currentTenant().rncEmpre),
                df_codsucu: this.toStringMax(facturaRaw?.fa_codSucu ?? tenantSucursal, 10),
                df_pendiente: this.toStringMax(item?.df_pendiente, 1),
                df_canpend: this.toNumberOrNull(item?.df_canpend),
              };
            });

            const { error: detalleError } = await this.db
              .from('detfactura')
              .insert(detallePayload);
            if (detalleError) throw detalleError;

            const idsucursal = this.toNumber(
              facturaRaw?.fa_codSucu ?? tenantSucursal,
            );
            await this.descontarInventarioFactura(detalleRaw, idsucursal);
          }
        } catch (error) {
          let rollback = this.db.from('factura').delete().eq('fa_codfact', codigo);
          rollback = this.applyTenantFilter(rollback);
          await rollback;
          throw error;
        }

        return {
          status: 'success',
          code: 200,
          message: 'Facturación creada correctamente.',
          data: {
            factura: this.mapFacturaDbToUi(insertedFactura),
            detalle: detalleRaw,
          },
        };
      } catch (error) {
        throw error;
      }
    })());
  }

  obtenerFacturasNoImpresas(): Observable<any> {
    if (!this.useSupabase) {
      const endpoint = '/facturas-no-impresas';
      const params = new HttpParams();
      return this.http.get(endpoint, params);
    }

    return from((async () => {
      let query = this.db
        .from('factura')
        .select('*')
        .or('fa_impresa.eq.N,and(fa_impresa.eq.S,fa_fpago.eq.N),fa_status.eq.C,and(fa_status.eq.F,fa_fpago.eq.N)')
        .order('fa_fecfact', { ascending: false })
        .limit(500);
      query = this.applyTenantFilter(query);
      const { data, error } = await query;
      if (error) throw error;
      return {
        status: 'success',
        code: 200,
        data: (data || []).map((row: any) => this.mapFacturaDbToUi(row)),
      };
    })());
  }

  buscarMercanciaPorFactura(fa_codFact: string): Observable<any> {
    if (!this.useSupabase) {
      const safe = encodeURIComponent(fa_codFact);
      return this.http.GetRequest<any>(`/facturacion/${safe}/buscar-mercancia`);
    }

    const codigo = String(fa_codFact || '').trim();
    return from((async () => {
      if (!(await this.facturaExisteEnTenant(codigo))) {
        return { status: 'success', code: 200, data: [] };
      }

      let detalleQuery = this.db
        .from('detfactura')
        .select('*')
        .eq('df_codfact', codigo)
        .order('id', { ascending: true });
      detalleQuery = this.applyTenantFilterDetalle(detalleQuery);
      const { data, error } = await detalleQuery;
      if (error) throw error;
      return {
        status: 'success',
        code: 200,
        data: (data || []).map((row: any) => this.mapDetalleDbToUi(row)),
      };
    })());
  }

  marcarFacturaComoImpresa(payload: any) {
    if (!this.useSupabase) {
      const cod = payload.fa_codFact;
      return this.http.PatchRequest(`/factura-impresa/${cod}`, payload);
    }

    const cod = String(payload?.fa_codFact || '').trim();
    return from((async () => {
      const patch: any = {
        fa_impresa: 'S',
      };
      if (payload?.fa_fpago !== undefined) patch.fa_fpago = this.toStringOrNull(payload.fa_fpago);
      if (payload?.fa_envio !== undefined) patch.fa_envio = this.toNumberOrNull(payload.fa_envio);
      if (payload?.fa_codfpago !== undefined) patch.fa_codfpago = this.toNumberOrNull(payload.fa_codfpago);
      if (payload?.fa_origenpago !== undefined) patch.fa_origenpago = this.toStringOrNull(payload.fa_origenpago);
      if (payload?.fa_confirpago !== undefined) patch.fa_confirpago = this.toStringOrNull(payload.fa_confirpago);
      if (payload?.fa_notapago !== undefined) patch.fa_notapago = this.toStringOrNull(payload.fa_notapago);
      if (payload?.fa_status !== undefined) patch.fa_status = this.toStringMax(payload.fa_status, 3);
      if (payload?.estado_envio_dgii !== undefined) patch.estado_envio_dgii = this.toStringOrNull(payload.estado_envio_dgii);

      let updateQuery = this.db
        .from('factura')
        .update(patch)
        .eq('fa_codfact', cod)
        .select('*');
      updateQuery = this.applyTenantFilter(updateQuery);
      const { data, error } = await updateQuery.maybeSingle();
      if (error) throw error;
      return { status: 'success', code: 200, data: this.mapFacturaDbToUi(data) };
    })());
  }

  actualizarPagoEntregaCaja(payload: any) {
    if (!this.useSupabase) {
      const cod = payload.fa_codFact;
      return this.http.PatchRequest(`/factura-impresa/${cod}`, payload);
    }

    const cod = String(payload?.fa_codFact || '').trim();
    return from((async () => {
      const patch: any = {};
      if (payload?.fa_fpago !== undefined) patch.fa_fpago = this.toStringOrNull(payload.fa_fpago);
      if (payload?.fa_envio !== undefined) patch.fa_envio = this.toNumberOrNull(payload.fa_envio);
      if (payload?.fa_codfpago !== undefined) patch.fa_codfpago = this.toNumberOrNull(payload.fa_codfpago);
      if (payload?.fa_origenpago !== undefined) patch.fa_origenpago = this.toStringOrNull(payload.fa_origenpago);
      if (payload?.fa_confirpago !== undefined) patch.fa_confirpago = this.toStringOrNull(payload.fa_confirpago);
      if (payload?.fa_notapago !== undefined) patch.fa_notapago = this.toStringOrNull(payload.fa_notapago);

      if (Object.keys(patch).length === 0) {
        return { status: 'success', code: 200, data: null };
      }

      let updateQuery = this.db
        .from('factura')
        .update(patch)
        .eq('fa_codfact', cod)
        .select('*');
      updateQuery = this.applyTenantFilter(updateQuery);
      const { data, error } = await updateQuery.maybeSingle();
      if (error) throw error;
      return { status: 'success', code: 200, data: this.mapFacturaDbToUi(data) };
    })());
  }

  editarFacturacion(payload: any) {
    if (!this.useSupabase) {
      const cod = payload.factura.fa_codFact;
      return this.http.PutRequest(`/facturacion/${cod}`, payload);
    }

    const cod = String(payload?.factura?.fa_codFact || '').trim();
    return from((async () => {
      const facturaRaw = { ...(payload?.factura || {}) };
      const detalleRaw = Array.isArray(payload?.detalle) ? payload.detalle : [];
      let facturaActualQuery = this.db
        .from('factura')
        .select('fa_impresa,fa_fpago,fa_codsucu')
        .eq('fa_codfact', cod);
      facturaActualQuery = this.applyTenantFilter(facturaActualQuery);
      const { data: facturaActual, error: facturaActualError } =
        await facturaActualQuery.maybeSingle();
      if (facturaActualError) throw facturaActualError;
      if (!facturaActual) throw new Error(`No se encontrÃ³ la factura ${cod}.`);
      if (
        String(facturaActual.fa_impresa || '').trim().toUpperCase() !== 'N' ||
        String(facturaActual.fa_fpago || '').trim().toUpperCase() !== 'N'
      ) {
        throw new Error('Solo se pueden editar facturas no impresas y no pagadas.');
      }

      const facturaDbPayload = this.mapFacturaUiToDb(facturaRaw);
      delete facturaDbPayload.fa_codfact;

      let updateQuery = this.db
        .from('factura')
        .update(facturaDbPayload)
        .eq('fa_codfact', cod)
        .select('*');
      updateQuery = this.applyTenantFilter(updateQuery);
      const { data, error } = await updateQuery.maybeSingle();
      if (error) throw error;

      let detalleAnteriorQuery = this.db
        .from('detfactura')
        .select('df_codmerc,df_canmerc')
        .eq('df_codfact', cod);
      detalleAnteriorQuery = this.applyTenantFilterDetalle(detalleAnteriorQuery);
      const { data: detalleAnterior, error: detalleAnteriorError } =
        await detalleAnteriorQuery;
      if (detalleAnteriorError) throw detalleAnteriorError;

      const idsucursal = this.toNumber(facturaRaw?.fa_codSucu ?? facturaActual.fa_codsucu);
      const cantidades = new Map<string, number>();
      for (const item of detalleAnterior || []) {
        const codigo = String(item?.df_codmerc || '').trim();
        cantidades.set(codigo, (cantidades.get(codigo) || 0) - this.toNumber(item?.df_canmerc));
      }
      for (const item of detalleRaw) {
        const producto = item?.producto || {};
        const codigo = String(producto?.in_codmerc ?? item?.df_codMerc ?? '').trim();
        cantidades.set(codigo, (cantidades.get(codigo) || 0) + this.toNumber(item?.cantidad ?? item?.df_canMerc));
      }
      for (const [codigoProducto, diferencia] of cantidades) {
        if (!codigoProducto || !diferencia) continue;
        const { data: inventario, error: inventarioError } = await this.db
          .from('inventario')
          .select('id,inv_existencia')
          .eq('inv_codsucu', idsucursal)
          .eq('inv_codprod', codigoProducto)
          .limit(1)
          .maybeSingle();
        if (inventarioError) throw inventarioError;
        if (!inventario) continue;
        const { error: inventarioUpdateError } = await this.db
          .from('inventario')
          .update({
            inv_existencia: this.toNumber(inventario.inv_existencia) - diferencia,
            inv_fechamov: new Date().toISOString(),
          })
          .eq('id', Number(inventario.id));
        if (inventarioUpdateError) throw inventarioUpdateError;
      }

      let detalleDelete = this.db.from('detfactura').delete().eq('df_codfact', cod);
      detalleDelete = this.applyTenantFilterDetalle(detalleDelete);
      const { error: detalleDeleteError } = await detalleDelete;
      if (detalleDeleteError) throw detalleDeleteError;

      if (detalleRaw.length > 0) {
        const tenant = this.currentTenant();
        const detallePayload = detalleRaw.map((item: any) => {
          const producto = item?.producto || {};
          const cantidad = this.toNumber(item?.cantidad ?? item?.df_canMerc);
          const precio = this.toNumber(item?.precio ?? item?.df_preMerc);
          return {
            df_codfact: cod,
            df_fecfact: this.normalizeDate(facturaRaw?.fa_fecFact),
            df_codmerc: this.toStringMax(producto?.in_codmerc ?? item?.df_codMerc, 15) || '',
            df_desmerc: this.toStringMax(producto?.in_desmerc ?? item?.df_desMerc, 30),
            df_canmerc: cantidad,
            df_premerc: precio,
            df_valmerc: this.toNumber(item?.total ?? item?.df_valMerc) || cantidad * precio,
            df_cosmerc: this.toNumberOrNull(item?.costo ?? item?.df_cosMerc ?? producto?.in_cosmerc),
            df_codclie: this.toNumberOrNull(facturaRaw?.fa_codClie),
            df_status: this.toStringMax(item?.df_status, 3) || 'A',
            df_codepr: this.toStringMax(tenant.codEmpre, 6),
            tenant_rnc: this.toStringOrNull(tenant.rncEmpre),
            df_codsucu: this.toStringMax(idsucursal, 10),
          };
        });
        const { error: detalleInsertError } = await this.db
          .from('detfactura')
          .insert(detallePayload);
        if (detalleInsertError) throw detalleInsertError;
      }

      return { status: 'success', code: 200, data: this.mapFacturaDbToUi(data) };
    })());
  }

  actualizarSalidaFactura(codFact: string, payload: { fa_salida: string; idsalida: number }) {
    if (!this.useSupabase) {
      return this.http.PatchRequest(`/facturacion/actualizar-salida/${codFact}`, payload);
    }

    return from((async () => {
      let updateQuery = this.db
        .from('factura')
        .update({
          fa_salida: this.toStringOrNull(payload?.fa_salida) || 'S',
          idsalida: this.toStringOrNull(payload?.idsalida),
        })
        .eq('fa_codfact', String(codFact || '').trim())
        .select('*');
      updateQuery = this.applyTenantFilter(updateQuery);
      const { data, error } = await updateQuery.maybeSingle();
      if (error) throw error;
      return { status: 'success', code: 200, data: this.mapFacturaDbToUi(data) };
    })());
  }

  actualizarPagoYEntrega(facturas: any[]): Observable<any> {
    if (!this.useSupabase) {
      return this.http.PatchRequest('/facturacion/actualizar-pago-entrega', { facturas });
    }

    return from((async () => {
      const updates = Array.isArray(facturas) ? facturas : [];
      for (const item of updates) {
        const cod = String(item?.fa_codFact || '').trim();
        if (!cod) continue;

        const patch: any = {};
        if (item?.fa_fpago !== undefined) patch.fa_fpago = this.toStringOrNull(item.fa_fpago);
        if (item?.fa_entrega !== undefined) patch.fa_entrega = this.toStringOrNull(item.fa_entrega);

        if (Object.keys(patch).length === 0) continue;

        let updateQuery = this.db
          .from('factura')
          .update(patch)
          .eq('fa_codfact', cod)
          .select('fa_codfact');
        updateQuery = this.applyTenantFilter(updateQuery);
        const { data, error } = await updateQuery.maybeSingle();
        if (error) throw error;
        if (!data) {
          throw new Error(`Factura ${cod} no pertenece al tenant activo.`);
        }
      }

      return { status: 'success', code: 200, message: 'Facturas actualizadas' };
    })());
  }

  buscarTodasFacturacion(): Observable<any> {
    if (!this.useSupabase) {
      const url = `/facturacion`;
      return this.http.GetRequest<any>(url);
    }

    return from((async () => {
      let query = this.db
        .from('factura')
        .select('*')
        .order('fa_fecfact', { ascending: false })
        .order('fa_codfact', { ascending: false })
        .limit(1500);
      query = this.applyTenantFilter(query);

      const { data, error } = await query;
      if (error) throw error;

      return {
        status: 'success',
        code: 200,
        data: (data || []).map((row: any) => this.mapFacturaDbToUi(row)),
      };
    })());
  }

  buscarFacturasParaCierre(limit: number = 10000): Observable<any> {
    if (!this.useSupabase) {
      const url = `/facturacion?limit=${limit}`;
      return this.http.GetRequest<any>(url);
    }

    const safeLimit = Math.max(1, Number(limit) || 10000);
    return from((async () => {
      let query = this.db
        .from('factura')
        .select('*')
        .order('fa_fecfact', { ascending: false })
        .order('fa_codfact', { ascending: false })
        .limit(safeLimit);
      query = this.applyTenantFilter(query);

      const { data, error } = await query;
      if (error) throw error;
      return {
        status: 'success',
        code: 200,
        data: (data || []).map((row: any) => this.mapFacturaDbToUi(row)),
      };
    })());
  }

  eliminarFacturacion(fa_codFact: string): Observable<any> {
    if (!this.useSupabase) {
      return this.http.DeleteRequest(`/eliminar-facturacion/${fa_codFact}`, '');
    }

    const codigo = String(fa_codFact || '').trim();
    return from((async () => {
      if (!(await this.facturaExisteEnTenant(codigo))) {
        throw new Error(`Factura ${codigo} no pertenece al tenant activo.`);
      }

      let detDelete = this.db
        .from('detfactura')
        .delete()
        .eq('df_codfact', codigo);
      detDelete = this.applyTenantFilterDetalle(detDelete);
      const { error: detError } = await detDelete;
      if (detError) throw detError;

      let facturaDelete = this.db
        .from('factura')
        .delete()
        .eq('fa_codfact', codigo);
      facturaDelete = this.applyTenantFilter(facturaDelete);
      const { error } = await facturaDelete;
      if (error) throw error;

      return { status: 'success', code: 200 };
    })());
  }

  buscarFacturacionPorNombre(
    currentPage: number,
    pageSize: number,
    fa_nomClie: string
  ): Observable<any> {
    if (!this.useSupabase) {
      return this.http.GetRequest<any>(`/facturacion/${fa_nomClie}`);
    }

    return this.buscarFacturacion(currentPage, pageSize, undefined, fa_nomClie);
  }

  buscarFacturaDetalle(df_codFact: string): Observable<any> {
    if (!this.useSupabase) {
      return this.http.GetRequest<any>(`/detalle-factura/${df_codFact}`);
    }

    const codigo = String(df_codFact || '').trim();
    return from((async () => {
      if (!(await this.facturaExisteEnTenant(codigo))) {
        return { status: 'success', code: 200, data: [] };
      }

      let detalleQuery = this.db
        .from('detfactura')
        .select('*')
        .eq('df_codfact', codigo)
        .order('id', { ascending: true });
      detalleQuery = this.applyTenantFilterDetalle(detalleQuery);
      const { data, error } = await detalleQuery;
      if (error) throw error;
      return {
        status: 'success',
        code: 200,
        data: (data || []).map((row: any) => this.mapDetalleDbToUi(row)),
      };
    })());
  }

  buscarFacturaDetallePendiente(df_codFact: string): Observable<any> {
    if (!this.useSupabase) {
      return this.http.GetRequest<any>(`/facturacion-detpendiente/${df_codFact}`);
    }

    const codigo = String(df_codFact || '').trim();
    return from((async () => {
      if (!(await this.facturaExisteEnTenant(codigo))) {
        return { status: 'success', code: 200, data: [] };
      }

      let detalleQuery = this.db
        .from('detfactura')
        .select('*')
        .eq('df_codfact', codigo)
        .or('df_pendiente.eq.P,df_canpend.gt.0')
        .order('id', { ascending: true });
      detalleQuery = this.applyTenantFilterDetalle(detalleQuery);
      const { data, error } = await detalleQuery;
      if (error) throw error;

      return {
        status: 'success',
        code: 200,
        data: (data || []).map((row: any) => this.mapDetalleDbToUi(row)),
      };
    })());
  }

  actutalizarPendienteNuevo(payload: any) {
    if (!this.useSupabase) {
      return this.http.PutRequest(`/factura/pendiente`, payload);
    }

    return from((async () => {
      const codFact = String(payload?.fa_codFact || payload?.factura?.fa_codFact || '').trim();
      if (!codFact) {
        throw new Error('No se recibió código de factura.');
      }
      if (!(await this.facturaExisteEnTenant(codFact))) {
        throw new Error(`Factura ${codFact} no pertenece al tenant activo.`);
      }

      const seleccion = Array.isArray(payload?.detalle) ? payload.detalle : [];
      const mapCantidad = new Map<string, number>();
      seleccion.forEach((d: any) => {
        const cod = String(d?.cod || d?.df_codMerc || '').trim();
        if (!cod) return;
        mapCantidad.set(cod, this.toNumber(d?.cantidad ?? d?.df_canpend));
      });

      let detalleQuery = this.db
        .from('detfactura')
        .select('id,df_codmerc,df_canmerc')
        .eq('df_codfact', codFact);
      detalleQuery = this.applyTenantFilterDetalle(detalleQuery);
      const { data: detalles, error: detalleError } = await detalleQuery;
      if (detalleError) throw detalleError;

      for (const det of detalles || []) {
        const codMerc = String(det?.df_codmerc || '').trim();
        const maxCantidad = this.toNumber(det?.df_canmerc);
        const requested = mapCantidad.get(codMerc);
        const canpend = requested === undefined
          ? 0
          : Math.max(0, Math.min(this.toNumber(requested), maxCantidad || this.toNumber(requested)));

        const patch = {
          df_pendiente: canpend > 0 ? 'P' : 'N',
          df_canpend: canpend,
        };

        let updateDet = this.db
          .from('detfactura')
          .update(patch)
          .eq('id', Number(det.id))
          .eq('df_codfact', codFact);
        updateDet = this.applyTenantFilterDetalle(updateDet);
        const { error: updateDetError } = await updateDet;
        if (updateDetError) throw updateDetError;
      }

      await this.recalcularPendienteFactura(codFact);
      return { status: 'success', code: 200, message: 'Pendiente actualizado' };
    })());
  }

  actutalizarPendienteModficado(
    fa_codFact: string,
    accion: 'poner' | 'quitar'
  ) {
    if (!this.useSupabase) {
      return this.http.PatchRequest(`/actualiza-pendiente/${fa_codFact}`, {
        accion,
      });
    }

    return from((async () => {
      const codFact = String(fa_codFact || '').trim();
      if (!codFact) {
        throw new Error('No se recibió código de factura.');
      }
      if (!(await this.facturaExisteEnTenant(codFact))) {
        throw new Error(`Factura ${codFact} no pertenece al tenant activo.`);
      }

      let detalleQuery = this.db
        .from('detfactura')
        .select('id,df_canmerc')
        .eq('df_codfact', codFact);
      detalleQuery = this.applyTenantFilterDetalle(detalleQuery);
      const { data: detalles, error: detalleError } = await detalleQuery;
      if (detalleError) throw detalleError;

      for (const det of detalles || []) {
        const maxCantidad = this.toNumber(det?.df_canmerc);
        const canpend = accion === 'poner' ? maxCantidad : 0;
        const patch = {
          df_pendiente: canpend > 0 ? 'P' : 'N',
          df_canpend: canpend,
        };

        let updateDet = this.db
          .from('detfactura')
          .update(patch)
          .eq('id', Number(det.id))
          .eq('df_codfact', codFact);
        updateDet = this.applyTenantFilterDetalle(updateDet);
        const { error: updateDetError } = await updateDet;
        if (updateDetError) throw updateDetError;
      }

      await this.recalcularPendienteFactura(codFact);
      return { status: 'success', code: 200, message: 'Pendiente actualizado' };
    })());
  }

  acturalizaDetPendiente(payload: any) {
    if (!this.useSupabase) {
      const cod = payload.factura.df_codFact;
      return this.http.PutRequest(`/actualiza-detpendiente/${cod}`, payload);
    }

    return from((async () => {
      const codFact = String(payload?.factura?.df_codFact || payload?.df_codFact || '').trim();
      const codMerc = String(payload?.factura?.df_codMerc || payload?.df_codMerc || '').trim();
      if (!codFact || !codMerc) {
        throw new Error('Debe indicar factura y producto para actualizar pendiente.');
      }
      if (!(await this.facturaExisteEnTenant(codFact))) {
        throw new Error(`Factura ${codFact} no pertenece al tenant activo.`);
      }

      let detalleGet = this.db
        .from('detfactura')
        .select('id,df_canmerc')
        .eq('df_codfact', codFact)
        .eq('df_codmerc', codMerc)
        .limit(1);
      detalleGet = this.applyTenantFilterDetalle(detalleGet);
      const { data: detalle, error: detalleError } = await detalleGet.maybeSingle();
      if (detalleError) throw detalleError;
      if (!detalle) {
        throw new Error('No se encontró el detalle de factura para actualizar.');
      }

      const maxCantidad = this.toNumber(detalle?.df_canmerc);
      const cantidadSolicitada = this.toNumber(
        payload?.factura?.df_canpend ??
        payload?.df_canpend ??
        payload?.cantidad
      );
      const canpend = Math.max(0, Math.min(cantidadSolicitada, maxCantidad || cantidadSolicitada));
      const patch = {
        df_pendiente: canpend > 0 ? 'P' : 'N',
        df_canpend: canpend,
      };

      let updateDet = this.db
        .from('detfactura')
        .update(patch)
        .eq('id', Number(detalle.id))
        .eq('df_codfact', codFact);
      updateDet = this.applyTenantFilterDetalle(updateDet);
      const { error: updateError } = await updateDet;
      if (updateError) throw updateError;

      await this.recalcularPendienteFactura(codFact);
      return { status: 'success', code: 200, message: 'Detalle pendiente actualizado' };
    })());
  }

  buscarFacturacion(
    pageIndex: number,
    pageSize: number,
    codigo?: string,
    nomcliente?: string,
    fecha?: string
  ): Observable<any> {
    if (!this.useSupabase) {
      let url = `/facturacion-numero?page=${pageIndex}&limit=${pageSize}`;

      if (codigo) {
        url += `&codigo=${codigo}`;
      }
      if (nomcliente) {
        url += `&nomcliente=${nomcliente}`;
      }
      if (fecha) {
        url += `&fecha=${fecha}`;
      }
      return this.http.GetRequest<any>(url);
    }

    const safePage = Math.max(1, Number(pageIndex) || 1);
    const safeLimit = Math.max(10, Number(pageSize) || 20);
    const offset = (safePage - 1) * safeLimit;

    const codigoTxt = String(codigo || '').trim();
    const nombreTxt = String(nomcliente || '').trim();
    const fechaTxt = String(fecha || '').trim();

    return from((async () => {
      let query = this.db
        .from('factura')
        .select('*', { count: 'exact' })
        .order('fa_fecfact', { ascending: false })
        .order('fa_codfact', { ascending: false })
        .range(offset, offset + safeLimit - 1);

      query = this.applyTenantFilter(query);

      if (codigoTxt) {
        query = query.ilike('fa_codfact', `%${codigoTxt}%`);
      }

      if (nombreTxt) {
        query = query.ilike('fa_nomclie', `%${nombreTxt}%`);
      }

      if (fechaTxt) {
        const parsedDate = this.normalizeDate(fechaTxt);
        if (parsedDate) {
          query = query.eq('fa_fecfact', parsedDate);
        } else {
          query = query.ilike('fa_codfact', `%${fechaTxt}%`);
        }
      }

      const { data, error, count } = await query;
      if (error) throw error;

      const total = Number(count || 0);
      return {
        status: 'success',
        code: 200,
        data: (data || []).map((row: any) => this.mapFacturaDbToUi(row)),
        pagination: {
          total,
          page: safePage,
          pageSize: safeLimit,
          totalPages: Math.max(1, Math.ceil(total / safeLimit)),
        },
      };
    })());
  }

  buscarFacturacionPendiente(
    pageIndex: number,
    pageSize: number
  ): Observable<any> {
    if (!this.useSupabase) {
      const url = `/facturacion/pendientes?page=${pageIndex}&limit=${pageSize}`;
      return this.http.GetRequest<any>(url);
    }

    const safePage = Math.max(1, Number(pageIndex) || 1);
    const safeLimit = Math.max(10, Number(pageSize) || 20);
    const offset = (safePage - 1) * safeLimit;

    return from((async () => {
      let query = this.db
        .from('factura')
        .select('*', { count: 'exact' })
        .or('fa_pendiente.eq.P,fa_pendiente.eq.S')
        .order('fa_fecfact', { ascending: false })
        .range(offset, offset + safeLimit - 1);

      query = this.applyTenantFilter(query);

      const { data, error, count } = await query;
      if (error) throw error;

      const total = Number(count || 0);
      return {
        status: 'success',
        code: 200,
        data: (data || []).map((row: any) => this.mapFacturaDbToUi(row)),
        pagination: {
          total,
          page: safePage,
          pageSize: safeLimit,
          totalPages: Math.max(1, Math.ceil(total / safeLimit)),
        },
      };
    })());
  }

  buscarFacturasPendientesDgii(): Observable<any> {
    if (!this.useSupabase) {
      return this.http.GetRequest<any>('/facturacion/pendientes-dgii');
    }

    return from((async () => {
      let query = this.db
        .from('factura')
        .select('*')
        .or('estado_envio_dgii.is.null,estado_envio_dgii.eq.PENDIENTE')
        .order('fa_fecfact', { ascending: false })
        .limit(500);

      query = this.applyTenantFilter(query);

      const { data, error } = await query;
      if (error) throw error;
      return {
        status: 'success',
        code: 200,
        data: (data || []).map((row: any) => this.mapFacturaDbToUi(row)),
      };
    })());
  }

  actualizarDatosDgii(fa_codFact: string, payload: any): Observable<any> {
    if (!this.useSupabase) {
      return this.http.PatchRequest(
        `/facturacion/actualizar-datos-dgii/${fa_codFact}`,
        payload
      );
    }

    const codigo = String(fa_codFact || '').trim();
    return from((async () => {
      const patch: any = {
        estado_dgii: this.toStringOrNull(payload?.estado_dgii) ?? undefined,
        codseguridad: this.toStringOrNull(payload?.codseguridad) ?? undefined,
        qr_link: this.toStringOrNull(payload?.qr_link) ?? undefined,
        fec_firma: this.toStringOrNull(payload?.fec_firma) ?? undefined,
        ecf: this.toStringOrNull(payload?.ecf) ?? undefined,
        rfce: this.toStringOrNull(payload?.rfce) ?? undefined,
        estado_envio_dgii: this.toStringOrNull(payload?.estado_envio_dgii) ?? undefined,
        fa_status: payload?.fa_status !== undefined ? this.toStringMax(payload.fa_status, 3) : undefined,
      };

      Object.keys(patch).forEach((k) => {
        if (patch[k] === undefined) delete patch[k];
      });

      let updateQuery = this.db
        .from('factura')
        .update(patch)
        .eq('fa_codfact', codigo)
        .select('*');
      updateQuery = this.applyTenantFilter(updateQuery);
      const { data, error } = await updateQuery.maybeSingle();
      if (error) throw error;

      return {
        status: 'success',
        code: 200,
        data: this.mapFacturaDbToUi(data),
      };
    })());
  }

  actualizarEntregaFactura(cod: string) {
    if (!this.useSupabase) {
      return this.http.PutRequest(`/factura/entregada/${cod}`, {});
    }

    const codigo = String(cod || '').trim();
    return from((async () => {
      let updateQuery = this.db
        .from('factura')
        .update({ fa_entrega: 'S' })
        .eq('fa_codfact', codigo)
        .select('*');
      updateQuery = this.applyTenantFilter(updateQuery);
      const { data, error } = await updateQuery.maybeSingle();
      if (error) throw error;
      return {
        status: 'success',
        code: 200,
        data: this.mapFacturaDbToUi(data),
      };
    })());
  }

  registrarImpresionDespacho(cod: string, tipoDespachador: string) {
    const codigo = String(cod || '').trim();
    const tipo = String(tipoDespachador || '').trim().toUpperCase();
    const patch = tipo === 'H'
      ? { fa_impalmap: 'S' }
      : tipo === 'F'
        ? { fa_impalmaf: 'S' }
        : null;

    if (!codigo || !patch) {
      return from(Promise.resolve({
        status: 'ignored',
        code: 200,
        data: null,
      }));
    }

    if (!this.useSupabase) {
      return this.http.PatchRequest(`/facturacion/${codigo}`, patch);
    }

    return from((async () => {
      let updateQuery = this.db
        .from('factura')
        .update(patch)
        .eq('fa_codfact', codigo)
        .select('*');
      updateQuery = this.applyTenantFilter(updateQuery);
      const { data, error } = await updateQuery.maybeSingle();
      if (error) throw error;
      return {
        status: 'success',
        code: 200,
        data: this.mapFacturaDbToUi(data),
      };
    })());
  }

  confirmarCierreFacturas(idCierre?: string | number, codigosFacturas?: string[]): Observable<any> {
    if (!this.useSupabase) {
      return this.http.PatchRequest('/facturacion/confirmar-cierre', {
        idcierre: idCierre,
        facturas: codigosFacturas || [],
      });
    }

    return from((async () => {
      const codigos = (codigosFacturas || [])
        .map((codigo) => String(codigo || '').trim())
        .filter(Boolean);

      if (!idCierre || codigos.length === 0) {
        return { status: 'success', code: 200, data: { updated: 0 } };
      }

      let base = this.db
        .from('factura')
        .update({ fa_cierre: String(idCierre) })
        .in('fa_codfact', codigos);
      base = this.applyTenantFilter(base);

      const { error } = await base;
      if (error) throw error;
      return { status: 'success', code: 200, data: { updated: codigos.length } };
    })());
  }
}
