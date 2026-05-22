import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";
import { HttpInvokeService } from "../../http-invoke.service";
import { VentainternaModel, VentainternaModelData } from ".";
import { SupabaseService } from "../../supabase/supabase.service";

@Injectable({
  providedIn: "root"
})
export class ServicioVentainterna {
  constructor(
    private http: HttpInvokeService,
    private supabase: SupabaseService,
  ) { }

  private get useSupabase(): boolean {
    return Boolean(this.supabase?.enabled && this.supabase?.client);
  }

  private get db(): any {
    const client = this.supabase.client;
    if (!client) throw new Error("Supabase no estÃ¡ configurado");
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
    return s.length > maxLen ? s.slice(0, maxLen) : s;
  }

  private normalizeDateOnly(value: any): string | null {
    if (!value) return null;
    const s = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const dmY = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
    if (dmY) return `${dmY[3]}-${dmY[2]}-${dmY[1]}`;
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
    if (parts.length) return parts.join(" | ");
    try {
      return JSON.stringify(error);
    } catch {
      return "Error desconocido";
    }
  }

  private throwStep(step: string, error: any): never {
    throw new Error(`[Ventainterna/Supabase] ${step}: ${this.formatDbError(error)}`);
  }

  private generarCodigoVentaInterna(sucursal: number, numero: number): string {
    const anio = new Date().getFullYear().toString();
    const sucStrFull = String(sucursal);
    const sucStr = sucStrFull.length > 2 ? sucStrFull.slice(-2) : sucStrFull.padStart(2, "0");
    const seqStr = String(numero).padStart(5, "0");
    return `${anio}${sucStr}${seqStr}`;
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
    return (
      rows.find((r: any) => this.toNumber(r?.idsucursal) === idsucursal && this.toNumber(r?.ano) === year) ||
      rows.find((r: any) => this.toNumber(r?.idsucursal) === idsucursal) ||
      rows.find((r: any) => !r?.idsucursal || this.toNumber(r?.idsucursal) === 0) ||
      rows[0] ||
      null
    );
  }

  private mapHeaderDbToUi(row: any): any {
    if (!row) return row;
    return {
      ...row,
      fa_codFact: row?.fa_codFact ?? row?.fa_codfact ?? null,
      fa_fecFact: row?.fa_fecFact ?? row?.fa_fecfact ?? null,
      fa_valFact: row?.fa_valFact ?? row?.fa_valfact ?? null,
      fa_itbiFact: row?.fa_itbiFact ?? row?.fa_itbifact ?? null,
      fa_subFact: row?.fa_subFact ?? row?.fa_subfact ?? null,
      fa_codClie: row?.fa_codClie ?? row?.fa_codclie ?? null,
      fa_nomClie: row?.fa_nomClie ?? row?.fa_nomclie ?? null,
      suculsar_clie: row?.suculsar_clie ?? null,
      fa_codVend: row?.fa_codVend ?? row?.fa_codvend ?? null,
      fa_nomVend: row?.fa_nomVend ?? row?.fa_nomvend ?? null,
      fa_solicitud: row?.fa_solicitud ?? null,
      fa_status: row?.fa_status ?? null,
      fa_codEmpr: row?.fa_codEmpr ?? row?.fa_codempr ?? null,
      fa_codSucu: row?.fa_codSucu ?? row?.fa_codsucu ?? null,
    };
  }

  private mapDetalleDbToUi(row: any): any {
    if (!row) return row;
    return {
      ...row,
      df_codFact: row?.df_codFact ?? row?.df_codfact ?? null,
      df_fecFact: row?.df_fecFact ?? row?.df_fecfact ?? null,
      df_codMerc: row?.df_codMerc ?? row?.df_codmerc ?? null,
      df_desMerc: row?.df_desMerc ?? row?.df_desmerc ?? null,
      df_canMerc: row?.df_canMerc ?? row?.df_canmerc ?? null,
      df_preMerc: row?.df_preMerc ?? row?.df_premerc ?? null,
      df_valMerc: row?.df_valMerc ?? row?.df_valmerc ?? null,
      df_unidad: row?.df_unidad ?? null,
      df_cosMerc: row?.df_cosMerc ?? row?.df_cosmerc ?? null,
      df_codClie: row?.df_codClie ?? row?.df_codclie ?? null,
    };
  }

  private buildDetalleRows(detalle: any[], header: any, fa_codfact: string, idsucursal: number, fa_fecfact: string): any[] {
    return detalle.map((it: any) => {
      const prod = it?.producto || {};
      const cantidad = this.toNumber(it?.cantidad ?? it?.df_canMerc ?? it?.df_canmerc);
      const precio = this.toNumber(it?.precio ?? it?.df_preMerc ?? it?.df_premerc);
      const total = this.toNumber(it?.total ?? it?.df_valMerc ?? it?.df_valmerc) || cantidad * precio;
      const row: any = {
        df_codfact: fa_codfact,
        df_fecfact: fa_fecfact,
        df_codmerc: this.toStringMax(prod?.in_codmerc ?? it?.df_codMerc ?? it?.df_codmerc, 15) ?? "",
        df_desmerc: this.toStringMax(prod?.in_desmerc ?? it?.df_desMerc ?? it?.df_desmerc, 30),
        df_canmerc: cantidad,
        df_premerc: precio,
        df_valmerc: total,
        df_unidad: this.toStringMax(prod?.in_unidad ?? it?.unidad ?? it?.df_unidad, 8),
        df_cosmerc: this.toNumberOrNull(prod?.in_cosmerc ?? it?.costo ?? it?.df_cosMerc ?? it?.df_cosmerc),
        df_codclie: this.toStringMax(header?.fa_codClie ?? header?.fa_codclie, 10),
        df_status: this.toStringMax(header?.fa_status ?? "A", 3) ?? "A",
        df_nomclie: this.toStringMax(header?.fa_nomClie ?? header?.fa_nomclie, 10),
        df_codempr: this.toStringMax(header?.fa_codEmpr ?? header?.fa_codempr, 6),
        df_codsucu: idsucursal,
        df_tipo: this.toStringMax(header?.fa_tipo, 10) ?? "VENTA",
      };
      Object.keys(row).forEach((k) => {
        if (row[k] === null || row[k] === undefined || row[k] === "") delete row[k];
      });
      return row;
    });
  }

  private async descontarInventario(detalle: any[], idsucursal: number): Promise<void> {
    for (const it of detalle) {
      const prod = it?.producto || {};
      const cod = String(prod?.in_codmerc ?? it?.df_codMerc ?? it?.df_codmerc ?? "").trim();
      const cant = this.toNumber(it?.cantidad ?? it?.df_canMerc ?? it?.df_canmerc);
      if (!cod || cant <= 0) continue;

      const { data: invCur, error: invErr } = await this.db
        .from("inventario")
        .select("*")
        .eq("inv_codsucu", idsucursal)
        .eq("inv_codprod", cod)
        .limit(1)
        .maybeSingle();
      if (invErr) this.throwStep(`Leer inventario (${cod})`, invErr);
      if (!invCur) continue;

      const nueva = this.toNumber(invCur?.inv_existencia) - cant;
      const { error: invUpErr } = await this.db
        .from("inventario")
        .update({
          inv_existencia: nueva,
          inv_fechamov: new Date().toISOString(),
        })
        .eq("id", Number(invCur.id))
        .eq("inv_codsucu", idsucursal)
        .eq("inv_codprod", cod);
      if (invUpErr) this.throwStep(`Actualizar inventario (${cod})`, invUpErr);
    }
  }

  guardarVentainterna(ventainterna: any): Observable<any> {
    if (!this.useSupabase) {
      return this.http.PostRequest<any, any>("/ventainterna", ventainterna);
    }

    return from((async () => {
      try {
        const header = ventainterna?.ventainterna ?? ventainterna?.factura ?? {};
        const detalle = Array.isArray(ventainterna?.detalle) ? ventainterna.detalle : [];
        const idsucursal = this.toNumber(header?.fa_codSucu ?? header?.fa_codsucu ?? localStorage.getItem("idSucursal") ?? 0);
        if (!idsucursal) throw new Error("Sucursal invÃ¡lida para registrar venta interna.");

        const contRow = await this.getOrPickContFacturaRow(idsucursal);
        if (!contRow) throw new Error(`No existe contfactura para la sucursal ${idsucursal}.`);
        const contId = this.toNumberOrNull(contRow?.id ?? contRow?.cod);
        if (!contId) throw new Error("contfactura sin id.");

        const codProvided = this.toStringOrNull(header?.fa_codFact ?? header?.fa_codfact);
        const contActual = this.toNumber(contRow?.contvinterna ?? 0);
        const next = codProvided ? contActual : contActual + 1;
        const fa_codfact = codProvided ?? this.generarCodigoVentaInterna(idsucursal, next);

        if (!codProvided) {
          const contUpdate: any = { contvinterna: next };
          if (Object.prototype.hasOwnProperty.call(contRow, "ano")) {
            contUpdate.ano = this.toNumber(contRow?.ano) || new Date().getFullYear();
          }
          const { error: contErr } = await this.db
            .from("contfactura")
            .update(contUpdate)
            .eq("id", contId);
          if (contErr) this.throwStep("Actualizar contfactura", contErr);
        }

        const fa_fecfact = this.normalizeDateOnly(header?.fa_fecFact ?? header?.fa_fecfact) ?? new Date().toISOString().slice(0, 10);
        const total = this.toNumber(header?.fa_valFact ?? header?.fa_valfact) || detalle.reduce((acc: number, it: any) => acc + this.toNumber(it?.total), 0);
        const row: any = {
          fa_codfact,
          fa_fecfact,
          fa_valfact: total,
          fa_itbifact: this.toNumberOrNull(header?.fa_itbiFact ?? header?.fa_itbifact),
          fa_subfact: this.toNumberOrNull(header?.fa_subFact ?? header?.fa_subfact) ?? total,
          fa_cosfact: this.toNumberOrNull(header?.fa_cosFact ?? header?.fa_cosfact),
          fa_codclie: this.toStringMax(header?.fa_codClie ?? header?.fa_codclie, 10),
          fa_nomclie: this.toStringMax(header?.fa_nomClie ?? header?.fa_nomclie, 39),
          suculsar_clie: this.toStringMax(header?.suculsar_clie, 60),
          fa_telclie: this.toStringMax(header?.fa_telClie ?? header?.fa_telclie, 12),
          fa_dirclie: this.toStringMax(header?.fa_dirClie ?? header?.fa_dirclie, 40),
          fa_codvend: this.toStringMax(header?.fa_codVend ?? header?.fa_codvend, 10),
          fa_nomvend: this.toStringMax(header?.fa_nomVend ?? header?.fa_nomvend, 15),
          fa_usuario: this.toStringMax(header?.fa_usuario, 30),
          fa_status: this.toStringMax(header?.fa_status ?? "A", 4) ?? "A",
          fa_solicitud: this.toStringMax(header?.fa_solicitud, 12),
          fa_codempr: this.toStringMax(header?.fa_codEmpr ?? header?.fa_codempr, 6),
          fa_codsucu: idsucursal,
          fa_tipo: this.toStringMax(header?.fa_tipo, 10) ?? "VENTA",
        };
        Object.keys(row).forEach((k) => {
          if (row[k] === null || row[k] === undefined || row[k] === "") delete row[k];
        });

        const { data: ins, error: insErr } = await this.db
          .from("ventainterna")
          .insert(row)
          .select("*")
          .single();
        if (insErr) this.throwStep("Insertar ventainterna", insErr);

        if (detalle.length > 0) {
          const detRows = this.buildDetalleRows(detalle, header, fa_codfact, idsucursal, fa_fecfact);
          const { error: detErr } = await this.db.from("detventainterna").insert(detRows);
          if (detErr) this.throwStep("Insertar detventainterna", detErr);
          await this.descontarInventario(detalle, idsucursal);
        }

        return {
          status: "success",
          code: 200,
          data: {
            nuevoCodigo: fa_codfact,
            ventainterna: this.mapHeaderDbToUi(ins),
          },
        };
      } catch (error: any) {
        if (error?.message && String(error.message).includes("[Ventainterna/Supabase]")) throw error;
        this.throwStep("Guardar venta interna", error);
      }
    })()).pipe(map((res: any) => res));
  }

  editarVentainterna(fa_codFact: string, payload: any): Observable<any> {
    if (!this.useSupabase) {
      return this.http.PutRequest<any, any>(`/ventainterna/${fa_codFact}`, payload);
    }

    const codigo = String(fa_codFact || "").trim();
    const header = payload?.ventainterna ?? payload ?? {};
    const detalle = Array.isArray(payload?.detalle) ? payload.detalle : [];
    const idsucursal = this.toNumber(header?.fa_codSucu ?? header?.fa_codsucu ?? localStorage.getItem("idSucursal") ?? 0);
    const fa_fecfact = this.normalizeDateOnly(header?.fa_fecFact ?? header?.fa_fecfact) ?? new Date().toISOString().slice(0, 10);
    const total = this.toNumber(header?.fa_valFact ?? header?.fa_valfact) || detalle.reduce((acc: number, it: any) => acc + this.toNumber(it?.total), 0);
    const updateRow: any = {
      fa_fecfact,
      fa_valfact: total,
      fa_subfact: total,
      fa_codclie: this.toStringMax(header?.fa_codClie ?? header?.fa_codclie, 10),
      fa_nomclie: this.toStringMax(header?.fa_nomClie ?? header?.fa_nomclie, 39),
      suculsar_clie: this.toStringMax(header?.suculsar_clie, 60),
      fa_codvend: this.toStringMax(header?.fa_codVend ?? header?.fa_codvend, 10),
      fa_nomvend: this.toStringMax(header?.fa_nomVend ?? header?.fa_nomvend, 15),
      fa_solicitud: this.toStringMax(header?.fa_solicitud, 12),
      fa_codempr: this.toStringMax(header?.fa_codEmpr ?? header?.fa_codempr, 6),
      fa_codsucu: idsucursal || undefined,
      fa_status: this.toStringMax(header?.fa_status ?? "A", 4) ?? "A",
    };
    Object.keys(updateRow).forEach((k) => {
      if (updateRow[k] === null || updateRow[k] === undefined || updateRow[k] === "") delete updateRow[k];
    });

    return from((async () => {
      const { data, error } = await this.db
        .from("ventainterna")
        .update(updateRow)
        .eq("fa_codfact", codigo)
        .select("*")
        .maybeSingle();
      if (error) this.throwStep("Editar ventainterna", error);

      if (detalle.length > 0) {
        const { error: delErr } = await this.db.from("detventainterna").delete().eq("df_codfact", codigo);
        if (delErr) this.throwStep("Reemplazar detalle ventainterna", delErr);
        const detRows = this.buildDetalleRows(detalle, header, codigo, idsucursal, fa_fecfact);
        const { error: detErr } = await this.db.from("detventainterna").insert(detRows);
        if (detErr) this.throwStep("Insertar detalle ventainterna", detErr);
      }

      return { status: "success", code: 200, data: data ? this.mapHeaderDbToUi(data) : null };
    })()).pipe(map((res: any) => res));
  }

  buscarTodasVentainterna(pageIndex: number, pageSize: number, ): Observable<any> {
    let url = `/ventainterna?page=${pageIndex}&limit=${pageSize}`;

    console.log(url);
    if (!this.useSupabase) {
      return this.http.GetRequest<any>(url);
    }

    const offset = Math.max(pageIndex - 1, 0) * pageSize;
    return from((async () => {
      const { data, error, count } = await this.db
        .from("ventainterna")
        .select("*", { count: "exact" })
        .order("fa_codfact", { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (error) this.throwStep("Listar ventainterna", error);
      return {
        status: "success",
        code: 200,
        data: (data || []).map((r: any) => this.mapHeaderDbToUi(r)),
        pagination: { total: Number(count ?? 0), page: pageIndex, pageSize },
      };
    })()).pipe(map((res: any) => res));
  }

  // Búsqueda exacta por número de venta interna
  buscarVentainternaPorNumero(fa_codFact: string): Observable<any> {
    if (!this.useSupabase) {
      return this.http.GetRequest<any>(`/ventainterna/${fa_codFact}`);
    }
    const codigo = String(fa_codFact || "").trim();
    return from((async () => {
      const { data, error } = await this.db
        .from("ventainterna")
        .select("*")
        .eq("fa_codfact", codigo)
        .maybeSingle();
      if (error) this.throwStep("Buscar ventainterna por numero", error);
      return { status: "success", code: 200, data: data ? this.mapHeaderDbToUi(data) : null };
    })()).pipe(map((res: any) => res));
  }

  // s
  // Buscar por nombre de cliente (ruta específica del backend)
  buscarVentainternaPorNombreCliente(fa_nomClie: string): Observable<any> {
    if (!this.useSupabase) {
      return this.http.GetRequest<any>(`/ventainterna-buscador-cliente/${fa_nomClie}`);
    }
    const nom = String(fa_nomClie || "").trim();
    return this.buscarVentainterna(1, 100, undefined, nom);
  }
  buscarVentainternaDetalle(df_codFact: string): Observable<any> {
    if (!this.useSupabase) {
      return this.http.GetRequest<any>(`/detalle-ventainterna/${df_codFact}`);
    }
    const codigo = String(df_codFact || "").split("?")[0].trim();
    return from((async () => {
      const { data, error } = await this.db
        .from("detventainterna")
        .select("*")
        .eq("df_codfact", codigo)
        .order("id", { ascending: true });
      if (error) this.throwStep("Consultar detalle ventainterna", error);
      return { status: "success", code: 200, data: (data || []).map((r: any) => this.mapDetalleDbToUi(r)) };
    })()).pipe(map((res: any) => res));
  }


  buscarVentainterna(pageIndex: number, pageSize: number, codigo?: string, nomcliente?: string, fecha?:string,): Observable<any> {
    // Alinear con las rutas del backend: GET /api/ventainterna
    let url = `/ventainterna?page=${pageIndex}&limit=${pageSize}`;

    if (codigo) {
      url += `&codigo=${codigo}`;
    }
    if (nomcliente) {
      url += `&nomcliente=${nomcliente}`;
    }
    if (fecha) {
      url += `&fecha=${fecha}`;
    }
    if (!this.useSupabase) {
      return this.http.GetRequest<any>(url);
    }

    const offset = Math.max(pageIndex - 1, 0) * pageSize;
    const cod = String(codigo || "").trim();
    const nom = String(nomcliente || "").trim();
    const fec = String(fecha || "").trim();
    return from((async () => {
      let query = this.db
        .from("ventainterna")
        .select("*", { count: "exact" })
        .order("fa_codfact", { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (cod) query = query.ilike("fa_codfact", `%${cod}%`);
      if (nom) query = query.ilike("fa_nomclie", `%${nom}%`);
      if (fec) query = query.gte("fa_fecfact", fec).lte("fa_fecfact", fec);
      const { data, error, count } = await query;
      if (error) this.throwStep("Buscar ventainterna", error);
      return {
        status: "success",
        code: 200,
        data: (data || []).map((r: any) => this.mapHeaderDbToUi(r)),
        pagination: { total: Number(count ?? 0), page: pageIndex, pageSize },
      };
    })()).pipe(map((res: any) => res));
  }

  eliminarVentainterna(fa_codFact: string): Observable<any> {
    if (!this.useSupabase) {
      return this.http.PatchRequest(`/ventainterna-anular/${fa_codFact}`, {});
    }
    const codigo = String(fa_codFact || "").trim();
    return from((async () => {
      const { data, error } = await this.db
        .from("ventainterna")
        .update({ fa_status: "N", fa_nomclie: " **** NULA ****", fa_valfact: 0 })
        .eq("fa_codfact", codigo)
        .select("*")
        .maybeSingle();
      if (error) this.throwStep("Anular ventainterna", error);
      return { status: "success", code: 200, data: data ? this.mapHeaderDbToUi(data) : null };
    })()).pipe(map((res: any) => res));
  }

}
