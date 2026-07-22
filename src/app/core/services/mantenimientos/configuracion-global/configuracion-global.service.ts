import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from '../../supabase/supabase.service';
import {
  CertificadoInspeccion,
  ConfiguracionDgiiEmpresaData,
  ConfiguracionGlobalData,
} from './index';

@Injectable({
  providedIn: 'root',
})
export class ServicioConfiguracionGlobal {
  constructor(private supabase: SupabaseService) {}

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

  private toStringOrNull(value: any): string | null {
    if (value === null || value === undefined) return null;
    const s = String(value).trim();
    return s ? s : null;
  }

  private normalizeDate(input: any): string | null {
    if (!input) return null;
    const s = String(input).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const dt = new Date(s);
    if (isNaN(dt.getTime())) return null;
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private normalizeAmbiente(input: any): 'test' | 'prod' {
    return String(input || 'test').trim().toLowerCase() === 'prod'
      ? 'prod'
      : 'test';
  }

  private isMissingColumnError(error: any, column: string): boolean {
    const hay = String(column || '').trim();
    if (!hay) return false;
    const msg = String(error?.message || error?.error_description || '')
      .toLowerCase();
    return (
      msg.includes(`could not find the '${hay.toLowerCase()}' column`) ||
      msg.includes(`column "${hay.toLowerCase()}"`) ||
      msg.includes(`'${hay.toLowerCase()}'`)
    );
  }

  private mapRow(row: any): ConfiguracionGlobalData {
    return {
      id: Number(row?.id || 1),
      logoDataUrl: row?.logo_data_url ?? null,
      logoNombre: row?.logo_nombre ?? null,
      certificadoNombre: row?.certificado_nombre ?? null,
      certificadoP12Base64: row?.certificado_p12_base64 ?? null,
      certificadoPassword: row?.certificado_password ?? null,
      certificadoVence: this.normalizeDate(row?.certificado_vence),
      certificadoSubjectCn: row?.certificado_subject_cn ?? null,
      certificadoIssuerCn: row?.certificado_issuer_cn ?? null,
      dgiiBaseUrl: row?.dgii_base_url ?? null,
      dgiiAmbiente: row?.dgii_ambiente ?? 'test',
      updatedAt: row?.updated_at ?? null,
      updatedBy: row?.updated_by ?? null,
    };
  }

  private mapPayload(data: Partial<ConfiguracionGlobalData>): any {
    const has = (key: keyof ConfiguracionGlobalData): boolean =>
      Object.prototype.hasOwnProperty.call(data, key);

    const payload: any = {
      id: Number(data?.id || 1),
      updated_at: new Date().toISOString(),
    };

    if (has('logoDataUrl')) {
      payload.logo_data_url = data?.logoDataUrl ?? null;
    }
    if (has('logoNombre')) {
      payload.logo_nombre = this.toStringOrNull(data?.logoNombre);
    }
    if (has('certificadoNombre')) {
      payload.certificado_nombre = this.toStringOrNull(data?.certificadoNombre);
    }
    if (has('certificadoP12Base64')) {
      payload.certificado_p12_base64 = data?.certificadoP12Base64 ?? null;
    }
    if (has('certificadoPassword')) {
      payload.certificado_password = this.toStringOrNull(data?.certificadoPassword);
    }
    if (has('certificadoVence')) {
      payload.certificado_vence = this.normalizeDate(data?.certificadoVence);
    }
    if (has('certificadoSubjectCn')) {
      payload.certificado_subject_cn = this.toStringOrNull(data?.certificadoSubjectCn);
    }
    if (has('certificadoIssuerCn')) {
      payload.certificado_issuer_cn = this.toStringOrNull(data?.certificadoIssuerCn);
    }
    if (has('dgiiBaseUrl')) {
      payload.dgii_base_url = this.toStringOrNull(data?.dgiiBaseUrl);
    }
    if (has('dgiiAmbiente')) {
      payload.dgii_ambiente = this.toStringOrNull(data?.dgiiAmbiente) || 'test';
    }
    if (has('updatedBy')) {
      payload.updated_by = this.toStringOrNull(data?.updatedBy);
    }

    return payload;
  }

  obtenerConfiguracionGlobal(): Observable<any> {
    return from(
      (async () => {
        const { data, error } = await this.db
          .from('configuracion_global')
          .select('*')
          .eq('id', 1)
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          return this.mapRow(data);
        }
        return this.mapRow({
          id: 1,
          dgii_base_url: 'https://recepcion.grupohierro.net/ecf/api',
          dgii_ambiente: 'test',
        });
      })()
    ).pipe(
      map((row: ConfiguracionGlobalData) => ({
        status: 'success',
        code: 200,
        message: 'Configuración global cargada',
        data: row,
      }))
    );
  }

  guardarConfiguracionGlobal(
    data: Partial<ConfiguracionGlobalData>
  ): Observable<any> {
    const payload = this.mapPayload(data);

    return from(
      (async () => {
        let { data: updated, error } = await this.db
          .from('configuracion_global')
          .upsert(payload, { onConflict: 'id', ignoreDuplicates: false })
          .select('*')
          .maybeSingle();

        if (error && this.isMissingColumnError(error, 'dgii_ambiente')) {
          const legacyPayload = { ...payload };
          delete legacyPayload.dgii_ambiente;

          const retry = await this.db
            .from('configuracion_global')
            .upsert(legacyPayload, {
              onConflict: 'id',
              ignoreDuplicates: false,
            })
            .select('*')
            .maybeSingle();

          updated = retry.data;
          error = retry.error;
        }

        if (error) throw error;
        return this.mapRow(updated || payload);
      })()
    ).pipe(
      map((row: ConfiguracionGlobalData) => ({
        status: 'success',
        code: 200,
        message: 'Configuración global actualizada',
        data: row,
      }))
    );
  }

  obtenerAmbientesEmpresa(): Observable<any> {
    return from(
      (async () => {
        const [{ data: empresas, error: empresasError }, { data: ambientes, error: ambientesError }] =
          await Promise.all([
            this.db
              .from('empresas')
              .select('cod_empre,nom_empre,rnc_empre')
              .order('cod_empre', { ascending: true }),
            this.db
              .from('configuracion_dgii_empresa')
              .select('*')
              .order('cod_empre', { ascending: true }),
          ]);

        if (empresasError) throw empresasError;

        let ambientesRows = ambientes || [];
        if (ambientesError) {
          if (!this.esTablaNoExiste(ambientesError)) {
            throw ambientesError;
          }
          ambientesRows = [];
        }

        const ambientePorEmpresa = new Map<string, any>(
          ambientesRows.map((row: any) => [String(row?.cod_empre || '').trim(), row]),
        );

        return (empresas || []).map((empresa: any) => {
          const codEmpre = String(empresa?.cod_empre || '').trim();
          const cfg = ambientePorEmpresa.get(codEmpre);
          return this.mapEmpresaAmbiente(empresa, cfg);
        });
      })()
    ).pipe(
      map((rows: ConfiguracionDgiiEmpresaData[]) => ({
        status: 'success',
        code: 200,
        message: 'Ambientes DGII por empresa cargados',
        data: rows,
      }))
    );
  }

  guardarAmbienteEmpresa(
    codEmpre: string,
    ambiente: 'test' | 'prod' | string,
    notas?: string | null,
    updatedBy?: string | null,
  ): Observable<any> {
    const codigo = String(codEmpre || '').trim();
    const payload = {
      cod_empre: codigo,
      dgii_ambiente: this.normalizeAmbiente(ambiente),
      activo: true,
      notas: this.toStringOrNull(notas),
      updated_at: new Date().toISOString(),
      updated_by: this.toStringOrNull(updatedBy),
    };

    return from(
      (async () => {
        const { data, error } = await this.db
          .from('configuracion_dgii_empresa')
          .upsert(payload, { onConflict: 'cod_empre', ignoreDuplicates: false })
          .select('*')
          .maybeSingle();

        if (error) throw error;
        return data || payload;
      })()
    ).pipe(
      map((row: any) => ({
        status: 'success',
        code: 200,
        message: 'Ambiente DGII actualizado',
        data: row,
      }))
    );
  }

  private mapEmpresaAmbiente(empresa: any, cfg: any): ConfiguracionDgiiEmpresaData {
    return {
      codEmpre: String(empresa?.cod_empre || cfg?.cod_empre || '').trim(),
      nombreEmpresa: String(empresa?.nom_empre || '').trim(),
      rncEmpresa: empresa?.rnc_empre ?? null,
      dgiiAmbiente: this.normalizeAmbiente(cfg?.dgii_ambiente),
      activo: cfg?.activo !== false,
      notas: cfg?.notas ?? null,
      updatedAt: cfg?.updated_at ?? null,
      updatedBy: cfg?.updated_by ?? null,
    };
  }

  private esTablaNoExiste(error: any): boolean {
    const code = String(error?.code || '').trim();
    const msg = String(error?.message || '').toLowerCase();
    return (
      code === '42P01' ||
      code === 'PGRST205' ||
      msg.includes('does not exist') ||
      msg.includes('not exist') ||
      msg.includes('could not find the table')
    );
  }

  private numeroDgii(value: any): number {
    const n = Number(String(value ?? '').replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  private normalizarEscenarioDgii(scenario: any): any {
    if (!scenario) {
      return scenario;
    }

    const tipoEcf = String(scenario?.TipoeCF || '').trim();
    if (tipoEcf === '34') {
      return this.normalizarNotaCreditoDgii(scenario);
    }

    if (tipoEcf !== '44') return scenario;

    const limpio: any = { ...scenario };
    const keys = Object.keys(limpio);
    const lineas = keys
      .map((key) => /^NumeroLinea\[(\d+)\]$/.exec(key)?.[1])
      .filter((value): value is string => !!value);

    const indices = lineas.length
      ? Array.from(new Set(lineas))
      : keys
          .map((key) => /\[(\d+)\]$/.exec(key)?.[1])
          .filter((value): value is string => !!value);

    indices.forEach((index) => {
      limpio[`IndicadorFacturacion[${index}]`] = '4';
      delete limpio[`MontoITBIS[${index}]`];
      delete limpio[`TasaITBIS[${index}]`];
    });

    delete limpio.IndicadorMontoGravado;
    delete limpio.RegimenPagos;
    delete limpio.MontoGravadoTotal;
    delete limpio.MontoGravadoI1;
    delete limpio.MontoGravadoI2;
    delete limpio.MontoGravadoI3;
    delete limpio.ITBIS1;
    delete limpio.ITBIS2;
    delete limpio.ITBIS3;
    delete limpio.TotalITBIS;
    delete limpio.TotalITBIS1;
    delete limpio.TotalITBIS2;
    delete limpio.TotalITBIS3;

    const totalLineas = indices.reduce(
      (sum, index) => sum + this.numeroDgii(limpio[`MontoItem[${index}]`]),
      0
    );
    const total = this.numeroDgii(limpio.MontoTotal) || totalLineas;
    const montoExento = totalLineas || total;
    limpio.MontoExento = montoExento.toFixed(2);
    limpio.MontoTotal = total.toFixed(2);

    return limpio;
  }

  private normalizarNotaCreditoDgii(scenario: any): any {
    const limpio: any = { ...scenario };

    const indicadorNotaCredito = this.resolverIndicadorNotaCredito(limpio);
    const indicadorMontoGravado = this.resolverIndicadorMontoGravado(limpio);
    const encabezado: any = {
      Version: limpio.Version || '1.0',
      TipoeCF: '34',
      ENCF: limpio.ENCF,
      IndicadorNotaCredito: indicadorNotaCredito,
      IndicadorMontoGravado: indicadorMontoGravado,
      TipoIngresos: limpio.TipoIngresos || '01',
      TipoPago: limpio.TipoPago || '1',
    };

    delete limpio.Version;
    delete limpio.TipoeCF;
    delete limpio.ENCF;
    delete limpio.IndicadorNotaCredito;
    delete limpio.IndicadorMontoGravado;
    delete limpio.TipoIngresos;
    delete limpio.TipoPago;

    if (!encabezado.IndicadorMontoGravado) {
      delete encabezado.IndicadorMontoGravado;
    }

    return { ...encabezado, ...limpio };
  }

  private resolverIndicadorNotaCredito(scenario: any): string {
    const explicit = String(scenario?.IndicadorNotaCredito ?? '').trim();
    if (explicit === '0' || explicit === '1') return explicit;

    const fechaEmision = this.parseDgiiDate(scenario?.FechaEmision);
    const fechaModificada = this.parseDgiiDate(scenario?.FechaNCFModificado);
    if (!fechaEmision || !fechaModificada) return '0';

    const diffMs = fechaEmision.getTime() - fechaModificada.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 30 ? '1' : '0';
  }

  private resolverIndicadorMontoGravado(scenario: any): string {
    const explicit = String(scenario?.IndicadorMontoGravado ?? '').trim();
    if (explicit === '0' || explicit === '1') return explicit;

    const totalItbis = this.numeroDgii(scenario?.TotalITBIS);
    const montoGravado = this.numeroDgii(scenario?.MontoGravadoTotal);
    if (totalItbis > 0 || montoGravado > 0) return '1';

    const keys = Object.keys(scenario || {});
    const tieneItbisLinea = keys.some((key) => {
      return /^MontoITBIS\[\d+\]$/.test(key) && this.numeroDgii(scenario[key]) > 0;
    });
    return tieneItbisLinea ? '1' : '';
  }

  private parseDgiiDate(value: any): Date | null {
    const text = String(value || '').trim();
    const dmy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(text);
    if (dmy) {
      const date = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (iso) {
      const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
      return Number.isNaN(date.getTime()) ? null : date;
    }

    return null;
  }

  inspeccionarCertificado(
    p12Base64: string,
    password: string
  ): Observable<any> {
    return from(
      (async () => {
        const client: any = this.supabase.client;
        if (!client?.functions?.invoke) {
          throw new Error(
            'No se pudo invocar la función inspect-p12-certificate.'
          );
        }

        const { data, error } = await client.functions.invoke(
          'inspect-p12-certificate',
          {
            body: {
              p12Base64,
              password,
            },
          }
        );

        if (error) {
          const e: any = error;
          const details =
            e?.context?.statusText || e?.message || 'Error al leer certificado';
          throw new Error(String(details));
        }

        if (!data?.ok) {
          throw new Error(
            String(data?.message || 'No se pudo leer el certificado .p12')
          );
        }

        return data?.data as CertificadoInspeccion;
      })()
    ).pipe(
      map((info: CertificadoInspeccion) => ({
        status: 'success',
        code: 200,
        message: 'Certificado validado',
        data: info,
      }))
    );
  }

  enviarDgiiDirectCert(
    scenarios: any[],
    rncEmisor?: string
  ): Observable<any> {
    return from(
      (async () => {
        const escenariosNormalizados = (scenarios || []).map((scenario) =>
          this.normalizarEscenarioDgii(scenario)
        );

        const client: any = this.supabase.client;
        if (!client?.functions?.invoke) {
          throw new Error('No se pudo invocar la función send-dgii-direct-cert.');
        }

        const { data, error } = await client.functions.invoke(
          'send-dgii-direct-cert',
          {
            body: {
              scenarios: escenariosNormalizados,
              rncEmisor: this.toStringOrNull(rncEmisor),
            },
          }
        );

        if (error) {
          const e: any = error;
          let details =
            e?.context?.statusText || e?.message || 'Error enviando a DGII';
          let parsedBody: any = null;

          const ctx = e?.context;
          if (ctx && typeof ctx?.json === 'function') {
            try {
              const body = await ctx.json();
              parsedBody = body;
              const bodyMsg =
                body?.message ||
                body?.error?.message ||
                body?.details ||
                null;
              if (bodyMsg) {
                details = String(bodyMsg);
              }
            } catch {
              // Ignorar parse del body; se conserva details por defecto.
            }
          }

          const enriched = new Error(String(details)) as any;
          enriched.dgiiResponse = parsedBody;
          enriched.details = parsedBody?.details ?? parsedBody;
          throw enriched;
        }

        if (!data?.ok) {
          const enriched = new Error(String(data?.message || 'Error enviando a DGII')) as any;
          enriched.dgiiResponse = data;
          enriched.details = data?.details ?? data;
          throw enriched;
        }

        return data;
      })()
    ).pipe(
      map((resp: any) => ({
        status: 'success',
        code: 200,
        message: 'Factura enviada a DGII',
        data: resp,
      }))
    );
  }

}
