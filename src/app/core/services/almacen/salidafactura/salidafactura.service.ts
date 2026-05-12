import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { HttpInvokeService } from '../../http-invoke.service';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class ServicioSalidafactura {

  constructor(
    private http: HttpInvokeService,
    private supabase: SupabaseService,
  ) { }

  private get useSupabase(): boolean {
    return Boolean(this.supabase?.enabled && this.supabase?.client);
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

  private toNumberOrNull(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private toNumber(value: any): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  private toStringOrNull(value: any): string | null {
    if (value === null || value === undefined) return null;
    const s = String(value).trim();
    return s ? s : null;
  }

  private normalizeDateOnly(value: any): string | null {
    if (!value) return null;
    const s = String(value).trim();
    // ya viene como YYYY-MM-DD en este flujo
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private mapSalidaDbToUi(row: any): any {
    if (!row) return row;
    return {
      ...row,
      id: row.id ?? null,
      codSalida: row.codsalida ?? row.codSalida ?? null,
      idsucursal: row.idsucursal ?? row.idSucursal ?? null,
      fecSalida: row.fecsalida ?? row.fecSalida ?? null,
      horaSalida: row.horasalida ?? row.horaSalida ?? null,
      canFact: row.canfact ?? row.canFact ?? null,
      valFact: row.valfact ?? row.valFact ?? null,
      valPagado: row.valpagado ?? row.valPagado ?? null,
      codChofer: row.codchofer ?? row.codChofer ?? null,
      nomChofer: row.nomchofer ?? row.nomChofer ?? null,
      cedChofer: row.cedchofer ?? row.cedChofer ?? null,
      status: row.status ?? null,
    };
  }

  private mapDetSalidaDbToUi(row: any): any {
    if (!row) return row;
    return {
      ...row,
      idsalida: row.idsalida ?? row.idSalida ?? null,
      codSalida: row.codsalida ?? row.codSalida ?? null,
      idsucursal: row.idsucursal ?? row.idSucursal ?? null,
      codChofer: row.codchofer ?? row.codChofer ?? null,
      nomChofer: row.nomchofer ?? row.nomChofer ?? null,
      codFact: row.codfact ?? row.codFact ?? null,
      fecFact: row.fecfact ?? row.fecFact ?? null,
      nomClie: row.nomclie ?? row.nomClie ?? null,
      valFact: row.valfact ?? row.valFact ?? null,
      pagado: row.pagado ?? null,
      status: row.status ?? null,
      // compat: en algunas pantallas se usa fpago como flag de pagado
      fpago: row.pagado ?? row.fpago ?? null,
    };
  }

  private async syncFacturasSalidaSupabase(params: {
    codsalida: string;
    codfacts: string[];
    fa_salida?: string;
  }): Promise<void> {
    const codsalida = String(params?.codsalida ?? '').trim();
    const codfacts = Array.isArray(params?.codfacts) ? params.codfacts : [];
    const fa_salida = String(params?.fa_salida ?? 'S').trim() || 'S';

    if (!codsalida || codfacts.length === 0) return;
    if (!this.useSupabase) return;

    const uniqueFacts = Array.from(
      new Set(
        codfacts
          .map((c) => String(c ?? '').trim())
          .filter((c) => Boolean(c)),
      ),
    );
    if (uniqueFacts.length === 0) return;

    const { error } = await this.db
      .from('factura')
      .update({ fa_salida, idsalida: codsalida })
      .in('fa_codfact', uniqueFacts);
    if (error) throw error;
  }

  private async clearFacturasSalidaSupabase(params: {
    codsalida: string;
    codfacts: string[];
  }): Promise<void> {
    const codsalida = String(params?.codsalida ?? '').trim();
    const codfacts = Array.isArray(params?.codfacts) ? params.codfacts : [];
    if (!codsalida || codfacts.length === 0) return;
    if (!this.useSupabase) return;

    const uniqueFacts = Array.from(
      new Set(
        codfacts
          .map((c) => String(c ?? '').trim())
          .filter((c) => Boolean(c)),
      ),
    );
    if (uniqueFacts.length === 0) return;

    const { error } = await this.db
      .from('factura')
      .update({ fa_salida: 'N', idsalida: null })
      .in('fa_codfact', uniqueFacts)
      .eq('idsalida', codsalida);
    if (error) throw error;
  }

  guardarSalida(payload: any): Observable<any> {
    if (!this.useSupabase) {
      return this.http.PostRequest<any, any>('/controlsalida', payload);
    }

    return from((async () => {
      const codsalida = String(payload?.codsalida ?? payload?.codSalida ?? '').trim();
      if (!codsalida) throw new Error('codsalida requerido');

      const idsucursal = this.toNumberOrNull(payload?.idsucursal ?? payload?.idSucursal);
      const codchofer = this.toNumberOrNull(payload?.codchofer ?? payload?.codChofer);

      const salidaRow: any = {
        idsucursal,
        codsalida,
        fecsalida: this.normalizeDateOnly(payload?.fecsalida ?? payload?.fecSalida),
        horasalida: this.toStringOrNull(payload?.horasalida ?? payload?.horaSalida),
        canfact: this.toNumberOrNull(payload?.canfact ?? payload?.canFact),
        valfact: payload?.valfact ?? payload?.valFact ?? null,
        valpagado: payload?.valpagado ?? payload?.valPagado ?? null,
        codchofer,
        nomchofer: this.toStringOrNull(payload?.nomchofer ?? payload?.nomChofer),
        cedchofer: this.toStringOrNull(payload?.cedchofer ?? payload?.cedChofer),
        status: this.toStringOrNull(payload?.status) || 'P',
        envia: this.toStringOrNull(payload?.envia),
        idusuario: this.toNumberOrNull(payload?.idusuario ?? payload?.idUsuario),
      };

      // limpiar null/undefined para insert
      Object.keys(salidaRow).forEach((k) => {
        if (salidaRow[k] === null || salidaRow[k] === undefined || salidaRow[k] === '') {
          delete salidaRow[k];
        }
      });

      const { data: salidaInsert, error: salidaError } = await this.db
        .from('salida')
        .insert(salidaRow)
        .select('*')
        .single();
      if (salidaError) throw salidaError;

      const idsalida = this.toNumber(salidaInsert?.id);
      const detalles = Array.isArray(payload?.detalles) ? payload.detalles : [];

      if (detalles.length > 0) {
        const codfactsParaFactura: string[] = [];
        const detRows = detalles.map((d: any) => {
          const codfact = String(d?.codfact ?? d?.codFact ?? '').trim();
          if (!codfact) throw new Error('codfact requerido en detalle');
          codfactsParaFactura.push(codfact);
          const pagadoRaw = String(d?.pagado ?? d?.fpago ?? '').trim().toUpperCase();
          const pagado = pagadoRaw === 'S' || pagadoRaw === 'P' ? 'S' : 'N';
          const row: any = {
            idsalida,
            idsucursal,
            codsalida,
            codfact,
            fecfact: this.normalizeDateOnly(d?.fecfact ?? d?.fecFact),
            nomclie: this.toStringOrNull(d?.nomclie ?? d?.nomClie),
            valfact: d?.valfact ?? d?.valFact ?? null,
            codchofer,
            nomchofer: this.toStringOrNull(d?.nomchofer ?? d?.nomChofer) ?? salidaRow.nomchofer ?? null,
            pagado,
            status: this.toStringOrNull(d?.status) || 'P',
          };
          Object.keys(row).forEach((k) => {
            if (row[k] === null || row[k] === undefined || row[k] === '') delete row[k];
          });
          return row;
        });

        const { error: detError } = await this.db
          .from('detsalida')
          .insert(detRows);
        if (detError) throw detError;

        // Vincular facturas con la salida (para que en Caja aparezca idsalida)
        await this.syncFacturasSalidaSupabase({
          codsalida,
          codfacts: codfactsParaFactura,
          fa_salida: 'S',
        });
      }

      // Para compatibilidad con datos legacy, leemos por codsalida (no solo por idsalida)
      const { data: dets, error: detsError } = await this.db
        .from('detsalida')
        .select('*')
        .eq('codsalida', codsalida)
        .order('codfact', { ascending: true });
      if (detsError) throw detsError;

      const salidaUi = this.mapSalidaDbToUi(salidaInsert);
      const detsUi = (dets || []).map((r: any) => this.mapDetSalidaDbToUi(r));

      return {
        status: 'success',
        code: 200,
        data: { ...salidaUi, detsalida: detsUi },
      };
    })());
  }

  // Optional: Endpoint specific for validation if backend supports it
  validarFactura(codFact: string): Observable<any> {
    return this.http.GetRequest<any>(`/factura-para-salida/${codFact}`);
  }

  obtenerPorCodigoSalida(codSalida: string): Observable<any> {
    const cod = String(codSalida || '').trim();
    if (!cod) {
      return from(Promise.resolve({ status: 'success', code: 200, data: null }));
    }

    if (!this.useSupabase) {
      // Backend legacy (si existe). Si no existe, el caller lo manejará en error.
      return this.http.GetRequest<any>(`/controlsalida/codigo/${encodeURIComponent(cod)}`, false);
    }

    return from((async () => {
      const { data, error } = await this.db
        .from('salida')
        .select('*')
        .eq('codsalida', cod)
        .maybeSingle();
      if (error) throw error;
      return {
        status: 'success',
        code: 200,
        data: data ? this.mapSalidaDbToUi(data) : null,
      };
    })());
  }

  obtenerPorChoferYStatus(codChofer: string, status: string = 'P'): Observable<any> {
    if (!this.useSupabase) {
      return this.http.GetRequest<any>(`/controlsalida/chofer-status/${codChofer}?status=${status}`);
    }

    const cod = this.toNumberOrNull(codChofer);
    const st = String(status || 'P').trim();
    return from((async () => {
      let q = this.db
        .from('salida')
        .select('*')
        .order('id', { ascending: false })
        .limit(5);

      if (cod !== null) q = q.eq('codchofer', cod);
      if (st) q = q.eq('status', st);

      const { data: salidas, error } = await q;
      if (error) throw error;

      const list = Array.isArray(salidas) ? salidas : [];
      if (list.length === 0) {
        return { status: 'success', code: 200, data: [] };
      }

      // Adjuntar detalles solo al primero (el más reciente) para compatibilidad con UI actual
      const first = list[0];
      const idsalida = this.toNumber(first?.id);
      const codsalida = String(first?.codsalida ?? first?.codSalida ?? '').trim();
      let detQuery = this.db
        .from('detsalida')
        .select('*')
        .order('codfact', { ascending: true });
      detQuery = codsalida ? detQuery.eq('codsalida', codsalida) : detQuery.eq('idsalida', idsalida);
      const { data: dets, error: detErr } = await detQuery;
      if (detErr) throw detErr;

      const salidaWith = {
        ...this.mapSalidaDbToUi(first),
        detsalida: (dets || []).map((r: any) => this.mapDetSalidaDbToUi(r)),
      };
      return { status: 'success', code: 200, data: [salidaWith] };
    })());
  }

  editarSalida(id: number, payload: any): Observable<any> {
    if (!this.useSupabase) {
      return this.http.PutRequest<any, any>(`/controlsalida/${id}`, payload);
    }

    const safeId = this.toNumberOrNull(id);
    if (safeId === null) {
      return from(Promise.reject(new Error('id inválido')));
    }

    return from((async () => {
      const detalles = Array.isArray(payload?.detalles) ? payload.detalles : [];
      const canfactCalc = detalles.length;
      const valfactCalc = detalles.reduce((sum: number, d: any) => {
        const n = Number(d?.valfact ?? d?.valFact ?? 0);
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0);

      const patch: any = {
        status: this.toStringOrNull(payload?.status),
        valpagado: payload?.valpagado ?? payload?.valPagado ?? null,
        valdevolucion: payload?.valdevolucion ?? payload?.valDevolucion ?? null,
        canfact: this.toNumberOrNull(payload?.canfact ?? payload?.canFact ?? canfactCalc),
        valfact: payload?.valfact ?? payload?.valFact ?? valfactCalc,
      };

      Object.keys(patch).forEach((k) => {
        if (patch[k] === null || patch[k] === undefined || patch[k] === '') delete patch[k];
      });

      const { data: salidaUpdated, error: upErr } = await this.db
        .from('salida')
        .update(patch)
        .eq('id', safeId)
        .select('*')
        .maybeSingle();
      if (upErr) throw upErr;
      if (!salidaUpdated) {
        throw new Error(`Salida ${safeId} no encontrada para actualizar.`);
      }

      const codsalida = String(
        salidaUpdated?.codsalida ?? salidaUpdated?.codSalida ?? payload?.codsalida ?? payload?.codSalida ?? ''
      ).trim();

      // Antes del upsert/delete, leer detalles existentes para poder borrar los removidos
      const { data: detsPrev, error: detPrevErr } = await this.db
        .from('detsalida')
        .select('codfact')
        .eq('codsalida', codsalida);
      if (detPrevErr) throw detPrevErr;
      const prevCodfacts = new Set(
        (Array.isArray(detsPrev) ? detsPrev : [])
          .map((r: any) => String(r?.codfact ?? '').trim())
          .filter((s: string) => Boolean(s)),
      );

      if (detalles.length > 0) {

        const idsucursal = this.toNumberOrNull(payload?.idsucursal ?? payload?.idSucursal ?? salidaUpdated?.idsucursal);
        const codchofer = this.toNumberOrNull(payload?.codchofer ?? payload?.codChofer ?? salidaUpdated?.codchofer);
        const nomchofer = this.toStringOrNull(payload?.nomchofer ?? payload?.nomChofer ?? salidaUpdated?.nomchofer);

        const codfactsParaFactura: string[] = [];
        const detRows = detalles.map((d: any) => {
          const codfact = String(d?.codfact ?? d?.codFact ?? '').trim();
          if (!codfact) throw new Error('codfact requerido en detalle');
          codfactsParaFactura.push(codfact);
          const pagadoRaw = String(d?.pagado ?? d?.fpago ?? '').trim().toUpperCase();
          const pagado = pagadoRaw === 'S' || pagadoRaw === 'P' ? 'S' : 'N';

          const row: any = {
            idsalida: safeId,
            idsucursal,
            codsalida,
            codfact,
            fecfact: this.normalizeDateOnly(d?.fecfact ?? d?.fecFact),
            nomclie: this.toStringOrNull(d?.nomclie ?? d?.nomClie),
            valfact: d?.valfact ?? d?.valFact ?? null,
            codchofer,
            nomchofer: this.toStringOrNull(d?.nomchofer ?? d?.nomChofer) ?? nomchofer ?? null,
            pagado,
            status: this.toStringOrNull(d?.status) || 'P',
          };
          Object.keys(row).forEach((k) => {
            if (row[k] === null || row[k] === undefined || row[k] === '') delete row[k];
          });
          return row;
        });

        // Inserta nuevas facturas y actualiza existentes (PK: codsalida + codfact)
        const { error: upsertErr } = await this.db
          .from('detsalida')
          .upsert(detRows, { onConflict: 'codsalida,codfact' });
        if (upsertErr) throw upsertErr;

        // Borrar detsalida removidos y limpiar vínculo en factura
        const nextCodfacts = new Set(
          codfactsParaFactura.map((c) => String(c ?? '').trim()).filter((c) => Boolean(c)),
        );
        const removed: string[] = [];
        prevCodfacts.forEach((c) => {
          if (!nextCodfacts.has(c)) removed.push(c);
        });

        if (removed.length > 0) {
          const { error: delErr } = await this.db
            .from('detsalida')
            .delete()
            .eq('codsalida', codsalida)
            .in('codfact', removed);
          if (delErr) throw delErr;

          await this.clearFacturasSalidaSupabase({
            codsalida,
            codfacts: removed,
          });
        }

        await this.syncFacturasSalidaSupabase({
          codsalida,
          codfacts: codfactsParaFactura,
          fa_salida: 'S',
        });
      } else if (prevCodfacts.size > 0) {
        // Si se quedÃ³ sin facturas, borrar todos los detalles y limpiar vÃ­nculos
        const removedAll = Array.from(prevCodfacts);
        const { error: delAllErr } = await this.db
          .from('detsalida')
          .delete()
          .eq('codsalida', codsalida);
        if (delAllErr) throw delAllErr;
        await this.clearFacturasSalidaSupabase({ codsalida, codfacts: removedAll });
      }

      let detSelectQuery = this.db
        .from('detsalida')
        .select('*')
        .order('codfact', { ascending: true });
      detSelectQuery = codsalida ? detSelectQuery.eq('codsalida', codsalida) : detSelectQuery.eq('idsalida', safeId);
      const { data: dets, error: detErr } = await detSelectQuery;
      if (detErr) throw detErr;

      return {
        status: 'success',
        code: 200,
        data: {
          ...this.mapSalidaDbToUi(salidaUpdated || {}),
          detsalida: (dets || []).map((r: any) => this.mapDetSalidaDbToUi(r)),
        },
      };
    })());
  }
}
