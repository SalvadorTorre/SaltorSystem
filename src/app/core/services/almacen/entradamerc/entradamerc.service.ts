import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";
import { HttpInvokeService } from "../../http-invoke.service";
import { EntradamercModel, EntradamercModelData } from ".";
import { SupabaseService } from "../../supabase/supabase.service";

@Injectable({
  providedIn: "root"
})
export class ServicioEntradamerc {
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
      throw new Error("Supabase no está configurado");
    }
    const anyClient = client as any;
    if (typeof anyClient?.schema === "function") {
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
    if (value === null || value === undefined || value === "") return null;
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
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  private formatDbError(error: any): string {
    if (!error) return "Error desconocido";
    if (typeof error === "string") return error;
    const parts: string[] = [];
    if (error?.message) parts.push(String(error.message));
    if (error?.details) parts.push(String(error.details));
    if (error?.hint) parts.push(String(error.hint));
    if (error?.code) parts.push(`code=${String(error.code)}`);
    if (parts.length > 0) return parts.join(" | ");
    try {
      return JSON.stringify(error);
    } catch {
      return "Error desconocido";
    }
  }

  private throwStep(step: string, error: any): never {
    const msg = this.formatDbError(error);
    throw new Error(`[Entradamerc/Supabase] ${step}: ${msg}`);
  }

  private generarCodigoEntrada(sucursal: number, numero: number): string {
    const anio = new Date().getFullYear().toString();
    const sucStrFull = String(sucursal);
    const sucStr =
      sucStrFull.length > 2 ? sucStrFull.slice(-2) : sucStrFull.padStart(2, "0");
    const seqStr = String(numero).padStart(4, "0");
    return `${anio}${sucStr}${seqStr}`;
  }

  private sanitizeFileName(value: any): string {
    return String(value || "factura.pdf")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .slice(0, 80) || "factura.pdf";
  }

  private async subirPdfEntrada(file: File, codigoEntrada: string): Promise<string> {
    const client = this.supabase.client as any;
    if (!client?.storage?.from) {
      throw new Error("Supabase Storage no esta configurado.");
    }

    const bucket = "entradamerc";
    const fileName = this.sanitizeFileName(file.name);
    const year = new Date().getFullYear();
    const stamp = Date.now();
    const path = `entradas/${year}/${codigoEntrada}/${stamp}-${fileName}`;
    const { error } = await client.storage
      .from(bucket)
      .upload(path, file, {
        contentType: file.type || "application/pdf",
        upsert: false,
      });

    if (error) this.throwStep("Subir PDF entrada", error);
    return `${bucket}/${path}`;
  }

  private async getOrPickContFacturaRow(idsucursal: number): Promise<any | null> {
    const year = new Date().getFullYear();
    const { data, error } = await this.db
      .from("contfactura")
      .select("*")
      .order("id", { ascending: false })
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

  private mapEntradaDbToUi(row: any): any {
    if (!row) return row;
    return {
      ...row,
      me_codEntr: row?.me_codEntr ?? row?.me_codentr ?? null,
      me_fecEntr: row?.me_fecEntr ?? row?.me_fecentr ?? null,
      me_valEntr: row?.me_valEntr ?? row?.me_valentr ?? null,
      me_codSupl: row?.me_codSupl ?? row?.me_codsupl ?? null,
      me_nomSupl: row?.me_nomSupl ?? row?.me_nomsupl ?? null,
      me_facSupl: row?.me_facSupl ?? row?.me_facsupl ?? null,
      me_ordencomp: row?.me_ordencomp ?? null,
      me_fecSupl: row?.me_fecSupl ?? row?.me_fecsupl ?? null,
      me_status: row?.me_status ?? row?.me_status ?? null,
      me_codVend: row?.me_codVend ?? row?.me_codvend ?? null,
      me_nomVend: row?.me_nomVend ?? row?.me_nomvend ?? null,
      me_rncSupl: row?.me_rncSupl ?? row?.me_rncsupl ?? null,
      me_codEmpr: row?.me_codEmpr ?? row?.me_codempr ?? null,
      me_codSucu: row?.me_codSucu ?? row?.me_codsucu ?? null,
    };
  }

  private mapDetalleDbToUi(row: any): any {
    if (!row) return row;
    return {
      ...row,
      de_codEntr: row?.de_codEntr ?? row?.de_codentr ?? null,
      de_codMerc: row?.de_codMerc ?? row?.de_codmerc ?? null,
      de_desMerc: row?.de_desMerc ?? row?.de_desmerc ?? null,
      de_canEntr: row?.de_canEntr ?? row?.de_canentr ?? null,
      de_preMerc: row?.de_preMerc ?? row?.de_premerc ?? null,
      de_valEntr: row?.de_valEntr ?? row?.de_valentr ?? null,
      de_unidad: row?.de_unidad ?? row?.de_unidad ?? null,
      de_cosMerc: row?.de_cosMerc ?? row?.de_cosmerc ?? null,
      de_codSupl: row?.de_codSupl ?? row?.de_codsupl ?? null,
      de_fecEntr: row?.de_fecEntr ?? row?.de_fecentr ?? null,
      de_codEmpr: row?.de_codEmpr ?? row?.de_codempr ?? null,
      de_codSucu: row?.de_codSucu ?? row?.de_codsucu ?? null,
    };
  }

  guardarEntradamerc(entradamerc: any): Observable<any> {
    if (!this.useSupabase) {
      return this.http.PostRequest<any, any>("/entradamerc", entradamerc);
    }

    return from((async () => {
      try {
        const header = entradamerc?.entradamercancias ?? entradamerc?.entradamercancia ?? entradamerc?.entradamerc ?? {};
        const detalle = Array.isArray(entradamerc?.detalle) ? entradamerc.detalle : [];

        const idsucursal = this.toNumber(header?.me_codSucu ?? header?.me_codsucu ?? 0) || 0;
        if (!idsucursal) {
          throw new Error("Sucursal inválida para registrar entrada.");
        }

        const codEntrProvided = this.toStringOrNull(header?.me_codEntr ?? header?.me_codentr);
        let me_codentr = codEntrProvided;

        // Generar y reservar contador si no viene código (modo normal de UI)
        if (!me_codentr) {
          const contRow = await this.getOrPickContFacturaRow(idsucursal);
          if (!contRow) {
            throw new Error(`No existe contfactura para la sucursal ${idsucursal}.`);
          }

          const contId = this.toNumberOrNull(contRow?.id ?? contRow?.cod);
          if (!contId) throw new Error("contfactura sin id.");

          const contentradaActual = this.toNumber(contRow?.contentrada ?? 0);
          const entradaNext = contentradaActual + 1;
          me_codentr = this.generarCodigoEntrada(idsucursal, entradaNext);

          const contUpdate: any = { contentrada: entradaNext };
          if (Object.prototype.hasOwnProperty.call(contRow, "ano")) {
            contUpdate.ano = this.toNumber(contRow?.ano) || new Date().getFullYear();
          }

          const { error: contErr } = await this.db
            .from("contfactura")
            .update(contUpdate)
            .eq("id", contId);
          if (contErr) this.throwStep("Actualizar contfactura", contErr);
        }

        const archivoPdf = header?.archivoPdfEntrada instanceof File ? header.archivoPdfEntrada : null;
        const ubicacionPdf = archivoPdf
          ? await this.subirPdfEntrada(archivoPdf, me_codentr)
          : this.toStringOrNull(header?.imgfactura);

        const me_fecentr =
          this.normalizeDateOnly(header?.me_fecEntr ?? header?.me_fecentr) ??
          new Date().toISOString().slice(0, 10);

        const entradaRow: any = {
          me_codentr,
          me_fecentr: me_fecentr,
          me_valentr: this.toNumber(header?.me_valEntr ?? header?.me_valentr),
          me_codsupl: this.toStringMax(header?.me_codSupl ?? header?.me_codsupl, 6),
          me_nomsupl: this.toStringOrNull(header?.me_nomSupl ?? header?.me_nomsupl),
          me_facsupl: this.toStringMax(header?.me_facSupl ?? header?.me_facsupl, 30),
          me_ordencomp: this.toStringMax(header?.me_ordencomp, 30),
          me_fecsupl: this.normalizeDateOnly(header?.me_fecSupl ?? header?.me_fecsupl),
          me_status: this.toStringMax(header?.me_status ?? "A", 4) ?? "A",
          me_codvend: this.toStringMax(header?.me_codVend ?? header?.me_codvend, 5),
          me_nomvend: this.toStringMax(header?.me_nomVend ?? header?.me_nomvend, 15),
          imgfactura: ubicacionPdf,
          nota: this.toStringOrNull(header?.nota),
          vendedor: this.toStringMax(header?.vendedor, 25),
          despachado: this.toStringMax(header?.despachado, 25),
          chofer: this.toStringMax(header?.chofer, 25),
          me_rncsupl: this.toNumberOrNull(header?.me_rncSupl ?? header?.me_rncsupl),
          me_codempr: this.toStringMax(header?.me_codEmpr ?? header?.me_codempr, 6),
          me_codsucu: idsucursal,
          me_tipo: this.toStringMax(header?.me_tipo, 10) ?? "ENTRADA",
        };

        Object.keys(entradaRow).forEach((k) => {
          if (entradaRow[k] === null || entradaRow[k] === undefined || entradaRow[k] === "") {
            delete entradaRow[k];
          }
        });

        const { data: entradaIns, error: entradaErr } = await this.db
          .from("entradamerc")
          .insert(entradaRow)
          .select("*")
          .single();
        if (entradaErr) this.throwStep("Insertar entradamerc", entradaErr);

        // Insertar detalle
        if (detalle.length > 0) {
          const detRows = detalle.map((it: any) => {
            const prod = it?.producto || {};
            const cantidad = this.toNumber(it?.cantidad);
            const precio = this.toNumber(it?.precio);
            const total = this.toNumber(it?.total) || cantidad * precio;

            const row: any = {
              de_codentr: me_codentr,
              de_codmerc: this.toStringMax(prod?.in_codmerc ?? it?.de_codMerc ?? it?.de_codmerc, 15) ?? "",
              de_desmerc: this.toStringMax(prod?.in_desmerc ?? it?.de_desMerc ?? it?.de_desmerc, 30),
              de_canentr: cantidad,
              de_premerc: precio,
              de_valentr: total,
              de_unidad: this.toStringMax(prod?.in_unidad ?? it?.unidad ?? it?.de_unidad, 10),
              de_cosmerc: this.toNumberOrNull(it?.costo ?? it?.de_cosMerc ?? it?.de_cosmerc),
              de_codsupl: this.toNumberOrNull(header?.me_codSupl ?? header?.me_codsupl),
              de_fecentr: me_fecentr,
              de_codempr: this.toStringMax(header?.me_codEmpr ?? header?.me_codempr, 6),
              de_codsucu: idsucursal,
              de_tipo: this.toStringMax(header?.me_tipo, 10) ?? "ENTRADA",
            };

            Object.keys(row).forEach((k) => {
              if (row[k] === null || row[k] === undefined || row[k] === "") {
                delete row[k];
              }
            });
            return row;
          });

          const { error: detErr } = await this.db
            .from("detentradamerc")
            .insert(detRows);
          if (detErr) this.throwStep("Insertar detentradamerc", detErr);
        }

        // Ajuste de inventario: sumar existencia
        for (const it of detalle) {
          const prod = it?.producto || {};
          const cod = String(prod?.in_codmerc ?? it?.de_codMerc ?? it?.de_codmerc ?? "").trim();
          const des = String(prod?.in_desmerc ?? it?.de_desMerc ?? it?.de_desmerc ?? "").trim();
          const cant = this.toNumber(it?.cantidad);
          const precio = this.toNumber(it?.precio);
          if (!cod || cant <= 0) continue;

          const { data: invCur, error: invErr } = await this.db
            .from("inventario")
            .select("*")
            .eq("inv_codsucu", idsucursal)
            .eq("inv_codprod", cod)
            .limit(1)
            .maybeSingle();
          if (invErr) this.throwStep(`Leer inventario (${cod})`, invErr);

          if (!invCur) {
            const invRow: any = {
              inv_codsucu: idsucursal,
              inv_codprod: this.toStringMax(cod, 20) ?? cod,
              inv_desprod: this.toStringMax(des, 40),
              inv_preprod: precio || null,
              inv_existencia: cant,
              inv_fechamov: new Date().toISOString(),
            };
            Object.keys(invRow).forEach((k) => {
              if (invRow[k] === null || invRow[k] === undefined || invRow[k] === "") delete invRow[k];
            });

            const { error: invInsErr } = await this.db
              .from("inventario")
              .insert(invRow);
            if (invInsErr) this.throwStep(`Insertar inventario (${cod})`, invInsErr);
            continue;
          }

          const nueva = this.toNumber(invCur?.inv_existencia) + cant;
          const { error: invUpErr } = await this.db
            .from("inventario")
            .update({
              inv_existencia: nueva,
              inv_fechamov: new Date().toISOString(),
            })
            .eq("id", Number(invCur.id));
          if (invUpErr) this.throwStep(`Actualizar inventario (${cod})`, invUpErr);
        }

        const nuevoCodigo = me_codentr;
        return {
          status: "success",
          code: 200,
          data: {
            nuevoCodigo,
            entrada: this.mapEntradaDbToUi(entradaIns),
          },
        };
      } catch (error: any) {
        if (error?.message && String(error.message).includes("[Entradamerc/Supabase]")) {
          throw error;
        }
        this.throwStep("Guardar entrada", error);
      }
    })()).pipe(map((res: any) => res));
  }

  editarEntradamerc(me_codEntr: string, entradamerc: EntradamercModel): Observable<any> {
    if (!this.useSupabase) {
      return this.http.PutRequest<any, any>(`/entradamerc/${me_codEntr}`, entradamerc);
    }

    const codigo = String(me_codEntr || "").trim();
    const header = (entradamerc as any)?.entradamercancias ?? (entradamerc as any) ?? {};
    const payload: any = {
      me_fecentr: this.normalizeDateOnly(header?.me_fecEntr ?? header?.me_fecentr) ?? undefined,
      me_valentr: header?.me_valEntr !== undefined ? this.toNumber(header?.me_valEntr) : undefined,
      me_codsupl: this.toStringMax(header?.me_codSupl ?? header?.me_codsupl, 6) ?? undefined,
      me_nomsupl: this.toStringOrNull(header?.me_nomSupl ?? header?.me_nomsupl) ?? undefined,
      me_facsupl: this.toStringMax(header?.me_facSupl ?? header?.me_facsupl, 30) ?? undefined,
      me_ordencomp: this.toStringMax(header?.me_ordencomp, 30) ?? undefined,
      me_fecsupl: this.normalizeDateOnly(header?.me_fecSupl ?? header?.me_fecsupl) ?? undefined,
      me_status: this.toStringMax(header?.me_status, 4) ?? undefined,
      me_codvend: this.toStringMax(header?.me_codVend ?? header?.me_codvend, 5) ?? undefined,
      me_nomvend: this.toStringMax(header?.me_nomVend ?? header?.me_nomvend, 15) ?? undefined,
      imgfactura: this.toStringOrNull(header?.imgfactura) ?? undefined,
      nota: this.toStringOrNull(header?.nota) ?? undefined,
      vendedor: this.toStringMax(header?.vendedor, 25) ?? undefined,
      despachado: this.toStringMax(header?.despachado, 25) ?? undefined,
      chofer: this.toStringMax(header?.chofer, 25) ?? undefined,
      me_rncsupl: this.toNumberOrNull(header?.me_rncSupl ?? header?.me_rncsupl) ?? undefined,
      me_codempr: this.toStringMax(header?.me_codEmpr ?? header?.me_codempr, 6) ?? undefined,
      me_codsucu: header?.me_codSucu !== undefined ? this.toNumber(header?.me_codSucu) : undefined,
      me_tipo: this.toStringMax(header?.me_tipo, 10) ?? undefined,
    };
    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k];
    });

    return from((async () => {
      const { data, error } = await this.db
        .from("entradamerc")
        .update(payload)
        .eq("me_codentr", codigo)
        .select("*")
        .maybeSingle();
      if (error) this.throwStep("Editar entradamerc", error);
      return { status: "success", code: 200, data: data ? this.mapEntradaDbToUi(data) : null };
    })()).pipe(map((res: any) => res));
  }

  buscarTodasEntradamerc(pageIndex: number, pageSize: number, idsucursal?: number ): Observable<any> {
    let url = `/entradamerc?page=${pageIndex}&limit=${pageSize}`;
    if (idsucursal) {
      url += `&idsucursal=${encodeURIComponent(String(idsucursal))}`;
    }

    console.log(url);

    if (!this.useSupabase) {
      return this.http.GetRequest<any>(url);
    }

    const offset = Math.max(pageIndex - 1, 0) * pageSize;
    return from((async () => {
      let query = this.db
        .from("entradamerc")
        .select("*", { count: "exact" })
        .order("me_codentr", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (idsucursal) query = query.eq("me_codsucu", Number(idsucursal));

      const { data, error, count } = await query;
      if (error) this.throwStep("Listar entradamerc", error);
      return {
        status: "success",
        code: 200,
        data: (data || []).map((r: any) => this.mapEntradaDbToUi(r)),
        pagination: { total: Number(count ?? 0), page: pageIndex, pageSize },
      };
    })()).pipe(map((res: any) => res));
  }

  eliminarEntradamerc(me_codEntr: string): Observable<any> {
    if (!this.useSupabase) {
      return this.http.DeleteRequest(`/eliminar-entradamerc/${me_codEntr}`, "");
    }
    const codigo = String(me_codEntr || "").trim();
    return from((async () => {
      const { data: entrada, error: entradaReadErr } = await this.db
        .from("entradamerc")
        .select("*")
        .eq("me_codentr", codigo)
        .maybeSingle();
      if (entradaReadErr) this.throwStep("Leer entradamerc para eliminar", entradaReadErr);

      const { data: detalles, error: detalleReadErr } = await this.db
        .from("detentradamerc")
        .select("*")
        .eq("de_codentr", codigo);
      if (detalleReadErr) this.throwStep("Leer detentradamerc para eliminar", detalleReadErr);

      for (const det of detalles || []) {
        const cod = String(det?.de_codmerc ?? "").trim();
        const cant = this.toNumber(det?.de_canentr);
        const idsucursal =
          this.toNumber(det?.de_codsucu) ||
          this.toNumber(entrada?.me_codsucu);

        if (!cod || cant <= 0 || !idsucursal) continue;

        const { data: invCur, error: invErr } = await this.db
          .from("inventario")
          .select("*")
          .eq("inv_codsucu", idsucursal)
          .eq("inv_codprod", cod)
          .limit(1)
          .maybeSingle();
        if (invErr) this.throwStep(`Leer inventario para revertir entrada (${cod})`, invErr);
        if (!invCur?.id) {
          throw new Error(
            `[Entradamerc/Supabase] Revertir inventario: no existe inventario para producto ${cod} en sucursal ${idsucursal}.`
          );
        }

        const existenciaNueva = this.toNumber(invCur?.inv_existencia) - cant;
        const { error: invUpErr } = await this.db
          .from("inventario")
          .update({
            inv_existencia: existenciaNueva,
            inv_fechamov: new Date().toISOString(),
          })
          .eq("id", Number(invCur.id));
        if (invUpErr) this.throwStep(`Revertir inventario por eliminar entrada (${cod})`, invUpErr);
      }

      const { error: detErr } = await this.db
        .from("detentradamerc")
        .delete()
        .eq("de_codentr", codigo);
      if (detErr) this.throwStep("Eliminar detentradamerc", detErr);

      const { error } = await this.db
        .from("entradamerc")
        .delete()
        .eq("me_codentr", codigo);
      if (error) this.throwStep("Eliminar entradamerc", error);

      return { status: "success", code: 200, data: true };
    })()).pipe(map((res: any) => res));
  }


  buscarEntradamercPorNombre(currentPage: number, pageSize: number, me_nomEntr: string, ): Observable<any> {
    const safeNom = encodeURIComponent(me_nomEntr || '');
    if (!this.useSupabase) {
      return this.http.GetRequest<any>(`/entradamerc/${safeNom}`);
    }

    const offset = Math.max(currentPage - 1, 0) * pageSize;
    const nom = String(me_nomEntr || "").trim();
    return from((async () => {
      let query = this.db
        .from("entradamerc")
        .select("*", { count: "exact" })
        .order("me_codentr", { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (nom) query = query.ilike("me_nomsupl", `%${nom}%`);

      const { data, error, count } = await query;
      if (error) this.throwStep("Buscar entradamerc por nombre", error);
      return {
        status: "success",
        code: 200,
        data: (data || []).map((r: any) => this.mapEntradaDbToUi(r)),
        pagination: { total: Number(count ?? 0), page: currentPage, pageSize },
      };
    })()).pipe(map((res: any) => res));
  }
  buscarEntradamercDetalle(me_codEntr: string): Observable<any> {
    if (!this.useSupabase) {
      return this.http.GetRequest<any>(`/detalle-entradamerc/${me_codEntr}`);
    }

    const raw = String(me_codEntr || "").trim();
    const parts = raw.split("?");
    const codigo = parts[0];
    let limit = 9999;
    if (parts.length > 1) {
      const qs = parts[1];
      const match = /(?:^|&)limit=(\d+)/i.exec(qs);
      if (match) limit = Math.max(1, Number(match[1]) || limit);
    }

    return from((async () => {
      const { data, error } = await this.db
        .from("detentradamerc")
        .select("*")
        .eq("de_codentr", codigo)
        .order("de_codmerc", { ascending: true })
        .limit(limit);
      if (error) this.throwStep("Consultar detalle entradamerc", error);
      return {
        status: "success",
        code: 200,
        data: (data || []).map((r: any) => this.mapDetalleDbToUi(r)),
      };
    })()).pipe(map((res: any) => res));
  }

 buscarEntradamerc(pageIndex: number, pageSize: number, codigo?: string, nomcliente?: string, fecha?:string, idsucursal?: number): Observable<any> {
    let url = `/entradamerc?page=${pageIndex}&limit=${pageSize}`;

    if (codigo) {
      url += `&codigo=${encodeURIComponent(codigo)}`;
    }
    if (nomcliente) {
      url += `&nomcliente=${encodeURIComponent(nomcliente)}`;
    }
    if (fecha) {
      url += `&fecha=${encodeURIComponent(fecha)}`;
    }
    if (idsucursal) {
      url += `&idsucursal=${encodeURIComponent(String(idsucursal))}`;
    }

    if (!this.useSupabase) {
      return this.http.GetRequest<any>(url);
    }

    const offset = Math.max(pageIndex - 1, 0) * pageSize;
    const cod = String(codigo ?? "").trim();
    const nom = String(nomcliente ?? "").trim();
    const fec = String(fecha ?? "").trim();

    return from((async () => {
      let query = this.db
        .from("entradamerc")
        .select("*", { count: "exact" })
        .order("me_codentr", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (cod) query = query.ilike("me_codentr", `%${cod}%`);
      if (nom) query = query.ilike("me_nomsupl", `%${nom}%`);
      if (fec) query = query.gte("me_fecentr", fec).lte("me_fecentr", fec);
      if (idsucursal) query = query.eq("me_codsucu", Number(idsucursal));

      const { data, error, count } = await query;
      if (error) this.throwStep("Buscar entradamerc", error);
      return {
        status: "success",
        code: 200,
        data: (data || []).map((r: any) => this.mapEntradaDbToUi(r)),
        pagination: { total: Number(count ?? 0), page: pageIndex, pageSize },
      };
    })()).pipe(map((res: any) => res));
  }

}
