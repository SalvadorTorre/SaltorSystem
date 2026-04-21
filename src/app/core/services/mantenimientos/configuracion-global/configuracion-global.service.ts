import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from '../../supabase/supabase.service';
import {
  CertificadoInspeccion,
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
    const payload: any = {
      id: 1,
      logo_data_url: data?.logoDataUrl,
      logo_nombre: this.toStringOrNull(data?.logoNombre),
      certificado_nombre: this.toStringOrNull(data?.certificadoNombre),
      certificado_p12_base64: data?.certificadoP12Base64,
      certificado_password: this.toStringOrNull(data?.certificadoPassword),
      certificado_vence: this.normalizeDate(data?.certificadoVence),
      certificado_subject_cn: this.toStringOrNull(data?.certificadoSubjectCn),
      certificado_issuer_cn: this.toStringOrNull(data?.certificadoIssuerCn),
      dgii_base_url: this.toStringOrNull(data?.dgiiBaseUrl),
      dgii_ambiente: this.toStringOrNull(data?.dgiiAmbiente) || 'test',
      updated_by: this.toStringOrNull(data?.updatedBy),
      updated_at: new Date().toISOString(),
    };

    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) {
        delete payload[k];
      }
    });

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
        const { data: updated, error } = await this.db
          .from('configuracion_global')
          .upsert(payload, { onConflict: 'id', ignoreDuplicates: false })
          .select('*')
          .maybeSingle();

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
}
