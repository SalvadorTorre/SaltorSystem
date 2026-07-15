import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { HttpInvokeService } from '../../http-invoke.service';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable({
  providedIn: 'root',
})
export class DevolucionService {
  constructor(
    private http: HttpInvokeService,
    private supabase: SupabaseService,
  ) {}

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

  private toStringMax(value: any, maxLen: number): string | null {
    const s = this.toStringOrNull(value);
    if (s === null) return null;
    if (!Number.isFinite(maxLen) || maxLen <= 0) return s;
    return s.length > maxLen ? s.slice(0, maxLen) : s;
  }

  private normalizeDateOnly(value: any): string | null {
    if (!value) return null;
    const s = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private formatDbError(error: any): string {
    if (!error) return 'Error desconocido';
    if (typeof error === 'string') return error;
    const parts: string[] = [];
    if (error?.message) parts.push(String(error.message));
    if (error?.details) parts.push(String(error.details));
    if (error?.hint) parts.push(String(error.hint));
    if (error?.code) parts.push(`code=${String(error.code)}`);
    if (parts.length > 0) return parts.join(' | ');
    try {
      return JSON.stringify(error);
    } catch {
      return 'Error desconocido';
    }
  }

  private throwStep(step: string, error: any): never {
    const msg = this.formatDbError(error);
    throw new Error(`[Devoluciones/Supabase] ${step}: ${msg}`);
  }

  private generarCodigoEntrada(sucursal: number, numero: number): string {
    const anio = new Date().getFullYear().toString();
    const sucStrFull = String(sucursal);
    const sucStr =
      sucStrFull.length > 2
        ? sucStrFull.slice(-2)
        : sucStrFull.padStart(2, '0');
    const seqStr = String(numero).padStart(4, '0');
    return `${anio}${sucStr}${seqStr}`;
  }

  private generarCodigoSalida(sucursal: number, numero: number): string {
    const anio = new Date().getFullYear().toString();
    const sucStrFull = String(sucursal);
    const sucStr =
      sucStrFull.length > 2
        ? sucStrFull.slice(-2)
        : sucStrFull.padStart(2, '0');
    const seqStr = String(numero).padStart(5, '0');
    return `${anio}${sucStr}${seqStr}`;
  }

  private async maxSecuenciaVentaInterna(idsucursal: number): Promise<number> {
    const anio = new Date().getFullYear().toString();
    const sucStrFull = String(idsucursal);
    const sucStr =
      sucStrFull.length > 2
        ? sucStrFull.slice(-2)
        : sucStrFull.padStart(2, '0');
    const prefix = `${anio}${sucStr}`;

    const { data, error } = await this.db
      .from('ventainterna')
      .select('fa_codfact')
      .like('fa_codfact', `${prefix}%`)
      .order('fa_codfact', { ascending: false })
      .limit(1);
    if (error) this.throwStep('Consultar contador ventainterna', error);

    const codigo = String(Array.isArray(data) && data.length ? data[0]?.fa_codfact : '').trim();
    const secuencia = Number(codigo.slice(prefix.length));
    return Number.isFinite(secuencia) ? secuencia : 0;
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
    if (rows.length === 0) return null;

    const exactYear = rows.find(
      (r: any) =>
        this.toNumber(r?.idsucursal) === idsucursal &&
        this.toNumber(r?.ano) === year,
    );
    if (exactYear) return exactYear;

    const exact = rows.find((r: any) => this.toNumber(r?.idsucursal) === idsucursal);
    if (exact) return exact;

    const principal = rows.find(
      (r: any) =>
        r?.idsucursal === null ||
        r?.idsucursal === undefined ||
        this.toNumber(r?.idsucursal) === 0,
    );
    return principal || rows[0] || null;
  }

  guardarDevolucion(payload: any): Observable<any> {
    if (!this.useSupabase) {
      return this.http.PostRequest<any, any>('/devolucion-completa', payload);
    }

    return from(
      (async () => {
        try {
          const entr = payload?.entradamercancia || {};
          const detEntrada = Array.isArray(payload?.detalleEntrada)
            ? payload.detalleEntrada
            : [];
          const vin = payload?.ventainterna || {};
          const detSalida = Array.isArray(payload?.detalleSalida)
            ? payload.detalleSalida
            : [];

          const idsucursal = this.toNumber(
            entr?.me_codSucu ?? entr?.me_codsucu ?? vin?.fa_codSucu ?? 0,
          );
          if (!idsucursal) {
            throw new Error('Sucursal inválida para registrar devolución.');
          }

          const contRow = await this.getOrPickContFacturaRow(idsucursal);
          if (!contRow) {
            throw new Error(
              `No existe contfactura para la sucursal ${idsucursal}.`,
            );
          }

          const contId = this.toNumberOrNull(contRow?.id ?? contRow?.cod);
          if (!contId) {
            throw new Error('contfactura sin id.');
          }

          const contentradaActual = this.toNumber(
            (Object.prototype.hasOwnProperty.call(contRow, 'contentrada')
              ? contRow.contentrada
              : contRow?.contEntrada ?? contRow?.cont_entrada) ?? 0,
          );
          const contvinternaActual = this.toNumber(
            (Object.prototype.hasOwnProperty.call(contRow, 'contvinterna')
              ? contRow.contvinterna
              : contRow?.contVinterna ?? contRow?.cont_vinterna) ?? 0,
          );

          const entradaNext = contentradaActual + 1;
          const salidaNext = Math.max(
            contvinternaActual,
            await this.maxSecuenciaVentaInterna(idsucursal),
          ) + 1;

          const me_codEntr = this.generarCodigoEntrada(idsucursal, entradaNext);
          const fa_codFact = this.generarCodigoSalida(idsucursal, salidaNext);

          // Reservar/actualizar contadores
          const contUpdate: any = {};
          if (
            Object.prototype.hasOwnProperty.call(contRow, 'contentrada') ||
            Object.prototype.hasOwnProperty.call(contRow, 'contEntrada') ||
            Object.prototype.hasOwnProperty.call(contRow, 'cont_entrada')
          ) {
            contUpdate.contentrada = entradaNext;
          }
          if (
            Object.prototype.hasOwnProperty.call(contRow, 'contvinterna') ||
            Object.prototype.hasOwnProperty.call(contRow, 'contVinterna') ||
            Object.prototype.hasOwnProperty.call(contRow, 'cont_vinterna')
          ) {
            contUpdate.contvinterna = salidaNext;
          }
          if (
            Object.prototype.hasOwnProperty.call(contRow, 'ano') ||
            Object.prototype.hasOwnProperty.call(contRow, 'year')
          ) {
            contUpdate.ano =
              this.toNumber(contRow?.ano) || new Date().getFullYear();
          }

          const { error: contErr } = await this.db
            .from('contfactura')
            .update(contUpdate)
            .eq('id', contId);
          if (contErr) this.throwStep('Actualizar contfactura', contErr);

          // ENTRADA: cabecera
          const entradaRow: any = {
            me_codentr: me_codEntr,
            me_fecentr:
              this.normalizeDateOnly(entr?.me_fecEntr) ??
              new Date().toISOString(),
            me_valentr: this.toNumber(entr?.me_valEntr),
            // defensivo: columnas varchar(15) en tablas legacy
            me_nomsupl: this.toStringMax(entr?.me_nomSupl, 39),
            me_facsupl: this.toStringMax(entr?.me_facSupl, 30),
            me_tipo: this.toStringMax(entr?.me_tipo, 10) ?? 'DEVOLUCION',
            me_nomvend: this.toStringMax(entr?.me_nomVend, 15),
            me_codempr: this.toStringOrNull(entr?.me_codEmpr),
            me_codsucu: idsucursal,
            me_status: 'A',
          };
          Object.keys(entradaRow).forEach((k) => {
            if (
              entradaRow[k] === null ||
              entradaRow[k] === undefined ||
              entradaRow[k] === ''
            ) {
              delete entradaRow[k];
            }
          });

          const { data: entradaIns, error: entradaErr } = await this.db
            .from('entradamerc')
            .insert(entradaRow)
            .select('*')
            .single();
          if (entradaErr) this.throwStep('Insertar entradamerc', entradaErr);

          // ENTRADA: detalle
          if (detEntrada.length > 0) {
            const detRows = detEntrada.map((it: any) => {
              const prod = it?.producto || {};
              const cantidad = this.toNumber(it?.cantidad);
              const precio = this.toNumber(it?.precio);
              const total = this.toNumber(it?.total) || cantidad * precio;
              const row: any = {
                de_codentr: me_codEntr,
                de_codmerc:
                  this.toStringMax(prod?.in_codmerc ?? it?.de_codMerc, 15) ?? '',
                de_desmerc: this.toStringOrNull(
                  prod?.in_desmerc ?? it?.de_desMerc,
                ),
                de_canentr: cantidad,
                de_premerc: precio,
                de_valentr: total,
                de_fecentr: entradaRow.me_fecentr,
                de_unidad: this.toStringOrNull(it?.unidad ?? it?.de_unidad),
                de_codsucu: idsucursal,
                de_codempr: this.toStringMax(entr?.me_codEmpr, 6),
                de_tipo: this.toStringMax(entr?.me_tipo, 10) ?? 'DEVOLUCION',
              };
              Object.keys(row).forEach((k) => {
                if (
                  row[k] === null ||
                  row[k] === undefined ||
                  row[k] === ''
                )
                  delete row[k];
              });
              return row;
            });

            const { error: detEntradaErr } = await this.db
              .from('detentradamerc')
              .insert(detRows);
            if (detEntradaErr)
              this.throwStep('Insertar detentradamerc', detEntradaErr);
          }

          // VENTA INTERNA: cabecera
          const vinRow: any = {
            fa_codfact: fa_codFact,
            fa_fecfact:
              this.normalizeDateOnly(vin?.fa_fecFact) ??
              new Date().toISOString(),
            fa_valfact: this.toNumber(vin?.fa_valFact),
            fa_codclie: this.toNumberOrNull(vin?.fa_codClie),
            fa_nomclie: this.toStringMax(vin?.fa_nomClie, 39),
            fa_codvend: this.toStringMax(vin?.fa_codVend, 10),
            fa_nomvend: this.toStringMax(vin?.fa_nomVend, 15),
            fa_codsucu: idsucursal,
            fa_codempr: this.toStringMax(vin?.fa_codEmpr, 6),
            fa_status: 'A',
            fa_tipo: 'DEVOLUCION',
          };
          Object.keys(vinRow).forEach((k) => {
            if (vinRow[k] === null || vinRow[k] === undefined || vinRow[k] === '')
              delete vinRow[k];
          });

          const { data: vinIns, error: vinErr } = await this.db
            .from('ventainterna')
            .insert(vinRow)
            .select('*')
            .single();
          if (vinErr) this.throwStep('Insertar ventainterna', vinErr);

          // VENTA INTERNA: detalle
          if (detSalida.length > 0) {
            const detRows = detSalida.map((it: any) => {
              const prod = it?.producto || {};
              const cantidad = this.toNumber(it?.cantidad);
              const precio = this.toNumber(it?.precio);
              const total =
                this.toNumber(it?.total ?? it?.valor) || cantidad * precio;
              const row: any = {
                df_codfact: fa_codFact,
                df_fecfact: vinRow.fa_fecfact,
                df_codmerc:
                  this.toStringMax(prod?.in_codmerc ?? it?.df_codMerc, 15) ?? '',
                df_desmerc: this.toStringOrNull(
                  prod?.in_desmerc ?? it?.df_desMerc,
                ),
                df_canmerc: cantidad,
                df_premerc: precio,
                df_valmerc: total,
                df_unidad: this.toStringOrNull(it?.unidad ?? it?.df_unidad),
                df_cosmerc: this.toNumberOrNull(it?.costo ?? it?.df_cosMerc),
                df_codclie: this.toNumberOrNull(vin?.fa_codClie),
                df_status: 'A',
                df_codsucu: idsucursal,
                df_codempr: this.toStringMax(vin?.fa_codEmpr, 6),
              };
              Object.keys(row).forEach((k) => {
                if (
                  row[k] === null ||
                  row[k] === undefined ||
                  row[k] === ''
                )
                  delete row[k];
              });
              return row;
            });

            const { error: detSalidaErr } = await this.db
              .from('detventainterna')
              .insert(detRows);
            if (detSalidaErr)
              this.throwStep('Insertar detventainterna', detSalidaErr);
          }

          // Ajuste de inventario: entrada suma, salida resta
          for (const it of detEntrada) {
            const prod = it?.producto || {};
            const cod = String(prod?.in_codmerc ?? '').trim();
            const cant = this.toNumber(it?.cantidad);
            if (!cod || cant <= 0) continue;

            const { data: invCur, error: invErr } = await this.db
              .from('inventario')
              .select('*')
              .eq('inv_codsucu', idsucursal)
              .eq('inv_codprod', cod)
              .limit(1)
              .maybeSingle();
            if (invErr) this.throwStep(`Leer inventario (${cod})`, invErr);
            if (!invCur) continue;

            const nueva = this.toNumber(invCur?.inv_existencia) + cant;
            const { error: invUpErr } = await this.db
              .from('inventario')
              .update({
                inv_existencia: nueva,
                inv_fechamov: new Date().toISOString(),
              })
              .eq('id', Number(invCur.id));
            if (invUpErr) this.throwStep(`Actualizar inventario entrada (${cod})`, invUpErr);
          }

          for (const it of detSalida) {
            const prod = it?.producto || {};
            const cod = String(prod?.in_codmerc ?? '').trim();
            const cant = this.toNumber(it?.cantidad);
            if (!cod || cant <= 0) continue;

            const { data: invCur, error: invErr } = await this.db
              .from('inventario')
              .select('*')
              .eq('inv_codsucu', idsucursal)
              .eq('inv_codprod', cod)
              .limit(1)
              .maybeSingle();
            if (invErr) this.throwStep(`Leer inventario (${cod})`, invErr);
            if (!invCur) continue;

            const nueva = this.toNumber(invCur?.inv_existencia) - cant;
            const { error: invUpErr } = await this.db
              .from('inventario')
              .update({
                inv_existencia: nueva,
                inv_fechamov: new Date().toISOString(),
              })
              .eq('id', Number(invCur.id));
            if (invUpErr) this.throwStep(`Actualizar inventario salida (${cod})`, invUpErr);
          }

          const devolucionRow = {
            fecha: new Date().toISOString(),
            codentrada: me_codEntr,
            codsalida: fa_codFact,
            idsucursal,
          };
          const { data: devolucionIns, error: devolucionErr } = await this.db
            .from('devolucion')
            .insert(devolucionRow)
            .select('*')
            .single();
          if (devolucionErr) this.throwStep('Insertar devolucion', devolucionErr);

          const iddevolucion = this.toNumberOrNull(devolucionIns?.id);
          if (!iddevolucion) {
            throw new Error('No se pudo obtener el id de la devolucion.');
          }

          const { error: entradaDevErr } = await this.db
            .from('entradamerc')
            .update({ iddevolucion })
            .eq('me_codentr', me_codEntr);
          if (entradaDevErr) this.throwStep('Marcar entrada con devolucion', entradaDevErr);

          const { error: salidaDevErr } = await this.db
            .from('ventainterna')
            .update({ iddevolucion })
            .eq('fa_codfact', fa_codFact);
          if (salidaDevErr) this.throwStep('Marcar salida con devolucion', salidaDevErr);

          return {
            status: 'success',
            code: 200,
            data: {
              entrada: { ...(entradaIns || {}), me_codEntr },
              vinterna: { ...(vinIns || {}), fa_codFact },
              devolucion: devolucionIns || devolucionRow,
              entradaCodigo: me_codEntr,
              salidaCodigo: fa_codFact,
            },
          };
        } catch (error: any) {
          // Re-lanzar con mejor contexto si no tiene prefijo
          if (error?.message && String(error.message).includes('[Devoluciones/Supabase]')) {
            throw error;
          }
          this.throwStep('Guardar devolución', error);
        }
      })(),
    );
  }

  consultarDevolucion(params: { id?: string | number | null; codsalida?: string | null }): Observable<any> {
    if (!this.useSupabase) {
      const query = new URLSearchParams();
      if (params?.id) query.set('id', String(params.id));
      if (params?.codsalida) query.set('codsalida', String(params.codsalida));
      return this.http.GetRequest<any>(`/devolucion-consulta?${query.toString()}`);
    }

    return from((async () => {
      const id = this.toNumberOrNull(params?.id);
      const codsalida = String(params?.codsalida || '').trim();

      let query = this.db.from('devolucion').select('*').limit(1);
      if (id !== null) {
        query = query.eq('id', id);
      } else if (codsalida) {
        query = query.eq('codsalida', codsalida);
      } else {
        return { status: 'success', code: 200, data: null };
      }

      const { data: devolucion, error: devolucionErr } = await query.maybeSingle();
      if (devolucionErr) this.throwStep('Consultar devolucion', devolucionErr);
      if (!devolucion) {
        return { status: 'success', code: 200, data: null };
      }

      const codEntrada = String(devolucion?.codentrada || '').trim();
      const codSalida = String(devolucion?.codsalida || '').trim();

      const [
        entradaResp,
        detEntradaResp,
        salidaResp,
        detSalidaResp,
      ] = await Promise.all([
        codEntrada
          ? this.db.from('entradamerc').select('*').eq('me_codentr', codEntrada).limit(1).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        codEntrada
          ? this.db.from('detentradamerc').select('*').eq('de_codentr', codEntrada).order('de_codmerc', { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        codSalida
          ? this.db.from('ventainterna').select('*').eq('fa_codfact', codSalida).limit(1).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        codSalida
          ? this.db.from('detventainterna').select('*').eq('df_codfact', codSalida).order('id', { ascending: true })
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (entradaResp.error) this.throwStep('Consultar entrada devolucion', entradaResp.error);
      if (detEntradaResp.error) this.throwStep('Consultar detalle entrada devolucion', detEntradaResp.error);
      if (salidaResp.error) this.throwStep('Consultar salida devolucion', salidaResp.error);
      if (detSalidaResp.error) this.throwStep('Consultar detalle salida devolucion', detSalidaResp.error);

      return {
        status: 'success',
        code: 200,
        data: {
          devolucion,
          entrada: entradaResp.data,
          detalleEntrada: detEntradaResp.data || [],
          salida: salidaResp.data,
          detalleSalida: detSalidaResp.data || [],
        },
      };
    })());
  }
}
