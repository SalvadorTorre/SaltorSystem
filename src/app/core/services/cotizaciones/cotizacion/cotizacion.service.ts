import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { CotizacionModel, CotizacionModelData } from ".";
import { SupabaseService } from "../../supabase/supabase.service";


@Injectable({
  providedIn: "root"
})
export class ServicioCotizacion {
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
      throw new Error("Supabase no esta configurado");
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

  private toStringMax(value: any, max: number): string | null {
    const s = this.toStringOrNull(value);
    if (!s) return null;
    return s.length > max ? s.slice(0, max) : s;
  }

  private normalizeDate(input: any): string | null {
    if (!input) return null;
    if (input instanceof Date && !isNaN(input.getTime())) {
      const y = input.getFullYear();
      const m = String(input.getMonth() + 1).padStart(2, "0");
      const d = String(input.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    const s = String(input).trim();
    const ddmmyyyy = s.match(/^([0-3]?\d)\/([0-1]?\d)\/(\d{4})$/);
    if (ddmmyyyy) {
      const d = ddmmyyyy[1].padStart(2, "0");
      const m = ddmmyyyy[2].padStart(2, "0");
      const y = ddmmyyyy[3];
      return `${y}-${m}-${d}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, "0");
      const d = String(parsed.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    return null;
  }

  private currentTenant(): { codEmpre: string; sucursal: number; rncEmpre: string } {
    const empresaRaw = localStorage.getItem("empresa");
    let empresaObj: any = null;
    try {
      empresaObj = empresaRaw ? JSON.parse(empresaRaw) : null;
    } catch {
      empresaObj = null;
    }

    const codEmpre = String(
      localStorage.getItem("codigoempresa") ||
      localStorage.getItem("cod_empre") ||
      empresaObj?.cod_empre ||
      "",
    ).trim();
    const rncEmpre = String(
      localStorage.getItem("rnc_empresa") ||
      empresaObj?.rnc_empre ||
      "",
    ).trim();
    const sucursal = Number(localStorage.getItem("idSucursal") || 0);
    return { codEmpre, sucursal, rncEmpre };
  }

  private applyCotizacionScope(query: any): any {
    const tenant = this.currentTenant();
    let scoped = query;
    if (tenant.codEmpre) {
      scoped = scoped.eq("ct_codempr", tenant.codEmpre);
    }
    if (Number.isFinite(tenant.sucursal) && tenant.sucursal > 0) {
      scoped = scoped.eq("ct_cod_sucu", tenant.sucursal);
    }
    return scoped;
  }

  private applyDetalleScope(query: any): any {
    const tenant = this.currentTenant();
    let scoped = query;
    if (tenant.codEmpre) {
      scoped = scoped.eq("dc_codempr", tenant.codEmpre);
    }
    if (Number.isFinite(tenant.sucursal) && tenant.sucursal > 0) {
      scoped = scoped.eq("dc_codsucu", tenant.sucursal);
    }
    return scoped;
  }

  private applyCotizacionReadScope(query: any): any {
    const tenant = this.currentTenant();
    let scoped = query;

    // La tabla solo debe mostrar documentos de la empresa y sucursal activas.
    // Si la sesión no tiene alguno de esos datos, el filtro cerrado evita
    // exponer cotizaciones de otro tenant por accidente.
    scoped = scoped.eq(
      "ct_codempr",
      tenant.codEmpre || "__NO_TENANT__",
    );
    scoped = scoped.eq(
      "ct_cod_sucu",
      Number.isFinite(tenant.sucursal) && tenant.sucursal > 0
        ? tenant.sucursal
        : -1,
    );
    return scoped;
  }

  private applyDetalleReadScope(query: any): any {
    const tenant = this.currentTenant();
    let scoped = query.eq(
      "dc_codempr",
      tenant.codEmpre || "__NO_TENANT__",
    );
    scoped = scoped.eq(
      "dc_codsucu",
      Number.isFinite(tenant.sucursal) && tenant.sucursal > 0
        ? tenant.sucursal
        : -1,
    );
    return scoped;
  }

  private async ensureTenantCodEmpre(): Promise<string> {
    const tenant = this.currentTenant();
    if (tenant.codEmpre) return tenant.codEmpre;
    if (!tenant.rncEmpre) return "";

    const { data, error } = await this.db
      .from("empresas")
      .select("cod_empre")
      .eq("rnc_empre", tenant.rncEmpre)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return String(data?.cod_empre || "").trim();
  }

  private buildCotizacionCodeFromContFactura(
    ano: number,
    idsucursal: number,
    contcotizacion: number,
  ): string {
    const anoStr = String(ano || new Date().getFullYear()).padStart(4, "0").slice(-4);
    const sucursalStr = String(idsucursal || 0).padStart(2, "0").slice(-2);
    const contStr = String(contcotizacion || 0).padStart(5, "0").slice(-5);
    return `${anoStr}${sucursalStr}${contStr}`;
  }

  private contfacturaCotizacionCounterField(row: any): string {
    if (Object.prototype.hasOwnProperty.call(row || {}, "contcotizacion")) return "contcotizacion";
    if (Object.prototype.hasOwnProperty.call(row || {}, "contcoti")) return "contcoti";
    if (Object.prototype.hasOwnProperty.call(row || {}, "contCotizacion")) return "contCotizacion";
    throw new Error("El registro de contfactura no tiene el campo contcotizacion.");
  }

  private contfacturaIdField(row: any): string {
    if (Object.prototype.hasOwnProperty.call(row || {}, "id")) return "id";
    if (Object.prototype.hasOwnProperty.call(row || {}, "cod")) return "cod";
    if (Object.prototype.hasOwnProperty.call(row || {}, "idcontfact")) return "idcontfact";
    if (Object.prototype.hasOwnProperty.call(row || {}, "idContFact")) return "idContFact";
    return "";
  }

  private async getOrPickContFacturaRow(idsucursal: number): Promise<any | null> {
    const year = new Date().getFullYear();
    const { data, error } = await this.db
      .from("contfactura")
      .select("*")
      .limit(200);
    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    return (
      rows.find(
        (r: any) =>
          this.toNumber(r?.idsucursal) === idsucursal &&
          this.toNumber(r?.ano) === year,
      ) ||
      rows.find((r: any) => this.toNumber(r?.idsucursal) === idsucursal) ||
      rows.find(
        (r: any) =>
          r?.idsucursal === null ||
          r?.idsucursal === undefined ||
          this.toNumber(r?.idsucursal) === 0,
      ) ||
      null
    );
  }

  private async cotizacionExiste(codigo: string): Promise<boolean> {
    let query = this.db
      .from("cotizacion")
      .select("ct_codcoti")
      .eq("ct_codcoti", codigo)
      .limit(1);
    query = this.applyCotizacionScope(query);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return !!data;
  }

  private async nextCotizacionCode(idsucursal: number): Promise<string> {
    if (!Number.isFinite(idsucursal) || idsucursal <= 0) {
      throw new Error("Sucursal invalida para generar el numero de cotizacion.");
    }

    const contRow = await this.getOrPickContFacturaRow(idsucursal);
    if (!contRow) {
      throw new Error(`No existe contfactura para la sucursal ${idsucursal}.`);
    }

    const idField = this.contfacturaIdField(contRow);
    const contId = this.toNumberOrNull(
      contRow?.id ?? contRow?.cod ?? contRow?.idcontfact ?? contRow?.idContFact,
    );
    if (!idField || !contId) {
      throw new Error("contfactura sin id.");
    }

    const counterField = this.contfacturaCotizacionCounterField(contRow);
    const ano = this.toNumber(contRow?.ano) || new Date().getFullYear();
    const contActual = this.toNumber(contRow?.[counterField]);

    for (let step = 1; step <= 50; step += 1) {
      const next = contActual + step;
      const codigo = this.buildCotizacionCodeFromContFactura(ano, idsucursal, next);
      const existe = await this.cotizacionExiste(codigo);
      if (existe) continue;

      const { error: updateError } = await this.db
        .from("contfactura")
        .update({ [counterField]: next })
        .eq(idField, contId);
      if (updateError) throw updateError;

      return codigo;
    }

    throw new Error("No se pudo generar un numero de cotizacion disponible desde contfactura.");
  }

  private mapCotizacionPayload(cotizacion: any, codigo: string, codEmpre: string, idsucursal: number): any {
    const payload: any = {
      ct_codcoti: codigo,
      ct_feccoti: this.normalizeDate(cotizacion?.ct_feccoti),
      ct_valcoti: this.toNumberOrNull(cotizacion?.ct_valcoti),
      ct_itbis: this.toNumberOrNull(cotizacion?.ct_itbis),
      ct_codclie: this.toNumberOrNull(cotizacion?.ct_codclie),
      ct_nomclie: this.toStringMax(cotizacion?.ct_nomclie, 50),
      ct_rnc: this.toStringMax(cotizacion?.ct_rnc, 11),
      ct_telclie: this.toStringMax(cotizacion?.ct_telclie, 17),
      ct_dirclie: this.toStringMax(cotizacion?.ct_dirclie, 50),
      ct_correo: this.toStringMax(cotizacion?.ct_correo, 50),
      ct_codvend: this.toStringMax(cotizacion?.ct_codvend, 5),
      ct_nomvend: this.toStringMax(cotizacion?.ct_nomvend, 15),
      ct_nota: this.toStringOrNull(cotizacion?.ct_nota),
      ct_status: this.toStringMax(cotizacion?.ct_status || "A", 4),
      ct_codempr: this.toStringMax(codEmpre, 6),
      ct_cod_sucu: idsucursal,
    };

    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k];
    });
    return payload;
  }

  private mapDetallePayload(detalle: any[], codigo: string, cotizacion: any, codEmpre: string, idsucursal: number): any[] {
    return (detalle || []).map((item: any, index: number) => ({
      dc_codcoti: codigo,
      dc_codmerc: this.toStringMax(item?.dc_codmerc, 15) || "",
      dc_descrip: this.toStringMax(item?.dc_descrip, 40),
      dc_canmerc: this.toNumberOrNull(item?.dc_canmerc),
      dc_premerc: this.toNumberOrNull(item?.dc_premerc),
      dc_valmerc: this.toNumberOrNull(item?.dc_valmerc),
      dc_unidad: this.toStringMax(item?.dc_unidad, 10),
      dc_costmer: this.toNumberOrNull(item?.dc_costmer),
      dc_codclie: this.toNumberOrNull(cotizacion?.ct_codclie ?? item?.dc_codclie),
      dc_item: index + 1,
      dc_status: this.toStringMax(item?.dc_status || "A", 4),
      dc_codempr: this.toStringMax(codEmpre, 6),
      dc_codsucu: idsucursal,
    }));
  }

  private mapCotizacionDbToUi(row: any): CotizacionModelData {
    return {
      ...row,
      ct_codcoti: String(row?.ct_codcoti || "").trim(),
      ct_feccoti: row?.ct_feccoti || "",
      ct_valcoti: this.toNumber(row?.ct_valcoti),
      ct_itbis: this.toNumber(row?.ct_itbis),
      ct_codclie: String(row?.ct_codclie ?? "").trim(),
      ct_nomclie: String(row?.ct_nomclie || "").trim(),
      ct_rnc: row?.ct_rnc as any,
      ct_telclie: String(row?.ct_telclie || "").trim(),
      ct_dirclie: String(row?.ct_dirclie || "").trim(),
      ct_correo: String(row?.ct_correo || "").trim(),
      ct_codvend: String(row?.ct_codvend || "").trim(),
      ct_nomvend: String(row?.ct_nomvend || "").trim(),
      ct_nota: String(row?.ct_nota || "").trim(),
      ct_status: String(row?.ct_status || "").trim(),
      detCotizacion: [],
    };
  }

  private mapDetalleDbToUi(row: any): any {
    return {
      ...row,
      dc_codcoti: String(row?.dc_codcoti || "").trim(),
      dc_codmerc: String(row?.dc_codmerc || "").trim(),
      dc_descrip: String(row?.dc_descrip || "").trim(),
      dc_canmerc: this.toNumber(row?.dc_canmerc),
      dc_premerc: this.toNumber(row?.dc_premerc),
      dc_valmerc: this.toNumber(row?.dc_valmerc),
      dc_unidad: String(row?.dc_unidad || "").trim(),
      dc_costmer: this.toNumber(row?.dc_costmer),
      dc_codclie: row?.dc_codclie,
      dc_status: String(row?.dc_status || "").trim(),
    };
  }

  private async contarDetallesCotizacion(codigo: string): Promise<number> {
    const { count, error } = await this.db
      .from("detcotizacion")
      .select("id", { count: "exact", head: true })
      .eq("dc_codcoti", codigo);
    if (error) throw error;
    return count || 0;
  }

  guardarCotizacion(cotizacion: any): Observable<any> {
    if (this.useSupabase) {
      return from((async () => {
        const cotizacionRaw = { ...(cotizacion?.cotizacion || {}) };
        const detalleRaw = Array.isArray(cotizacion?.detalle) ? cotizacion.detalle : [];
        const tenant = this.currentTenant();
        const codEmpre = await this.ensureTenantCodEmpre();
        const idsucursal = this.toNumber(
          cotizacionRaw?.ct_cod_sucu ?? cotizacionRaw?.ct_codSucu ?? tenant.sucursal,
        );
        const codigo = await this.nextCotizacionCode(idsucursal);

        cotizacionRaw.ct_codcoti = codigo;
        cotizacionRaw.ct_codempr = codEmpre;
        cotizacionRaw.ct_cod_sucu = idsucursal;

        const cotizacionPayload = this.mapCotizacionPayload(cotizacionRaw, codigo, codEmpre, idsucursal);
        const { data: insertedCotizacion, error: cotizacionError } = await this.db
          .from("cotizacion")
          .insert(cotizacionPayload)
          .select("*")
          .single();
        if (cotizacionError) throw cotizacionError;

        try {
          const detallePayload = this.mapDetallePayload(detalleRaw, codigo, cotizacionRaw, codEmpre, idsucursal);
          if (detallePayload.length > 0) {
            const { error: detalleError } = await this.db
              .from("detcotizacion")
              .insert(detallePayload);
            if (detalleError) throw detalleError;
          }
        } catch (error) {
          await this.db.from("cotizacion").delete().eq("ct_codcoti", codigo);
          throw error;
        }

        return {
          status: "success",
          code: 200,
          message: "Cotizacion creada correctamente.",
          data: {
            cotizacion: insertedCotizacion,
            detalle: detalleRaw,
          },
        };
      })());
    }

    return this.http.PostRequest<any, any>("/cotizacion", cotizacion, false);
  }

  editarCotizacion(ct_codcoti: string, cotizacion: any): Observable<any> {
    if (this.useSupabase) {
      return from((async () => {
        const codigo = String(ct_codcoti || "").trim();
        const cotizacionRaw = { ...(cotizacion?.cotizacion || cotizacion || {}) };
        const detalleRaw = Array.isArray(cotizacion?.detalle) ? cotizacion.detalle : [];
        const tenant = this.currentTenant();
        const codEmpre = await this.ensureTenantCodEmpre();
        const idsucursal = this.toNumber(
          cotizacionRaw?.ct_cod_sucu ?? cotizacionRaw?.ct_codSucu ?? tenant.sucursal,
        );

        const cotizacionPayload = this.mapCotizacionPayload(
          cotizacionRaw,
          codigo,
          codEmpre,
          idsucursal,
        );

        let updateQuery = this.db
          .from("cotizacion")
          .update(cotizacionPayload)
          .eq("ct_codcoti", codigo)
          .select("*");
        updateQuery = this.applyCotizacionScope(updateQuery);
        const { data: updatedCotizacion, error: updateError } = await updateQuery.maybeSingle();
        if (updateError) throw updateError;

        const detallesAntes = await this.contarDetallesCotizacion(codigo);

        const { error: deleteDetalleError } = await this.db
          .from("detcotizacion")
          .delete()
          .eq("dc_codcoti", codigo);
        if (deleteDetalleError) throw deleteDetalleError;

        if (detallesAntes > 0) {
          const detallesRestantes = await this.contarDetallesCotizacion(codigo);
          if (detallesRestantes > 0) {
            throw new Error(
              "No se pudieron eliminar los detalles anteriores de la cotizacion. Revise el permiso RLS de detcotizacion para editar cotizaciones.",
            );
          }
        }

        const detallePayload = this.mapDetallePayload(detalleRaw, codigo, cotizacionRaw, codEmpre, idsucursal);
        if (detallePayload.length > 0) {
          const { error: detalleError } = await this.db
            .from("detcotizacion")
            .insert(detallePayload);
          if (detalleError) throw detalleError;
        }

        return {
          status: "success",
          code: 200,
          message: "Cotizacion editada correctamente.",
          data: {
            cotizacion: updatedCotizacion,
            detalle: detalleRaw,
          },
        };
      })());
    }

    return this.http.PutRequest<any, any>(`/cotizacion/${ct_codcoti}`, cotizacion, false);
  }
//   editarCotizacion(data: any): Observable<any> {
//   return this.http.PutRequest("/cotizacion", data);
// }
  buscarTodasCotizacion(pageIndex: number, pageSize: number, ): Observable<any> {
    let url = `/cotizacion?page=${pageIndex}&limit=${pageSize}`;

    console.log(url);
    if (this.useSupabase) {
      return from((async () => {
        const offset = Math.max(pageIndex - 1, 0) * pageSize;
        let query = this.db
          .from("cotizacion")
          .select("*", { count: "exact" })
          .order("ct_feccoti", { ascending: false })
          .order("ct_codcoti", { ascending: false })
          .range(offset, offset + pageSize - 1);
        query = this.applyCotizacionReadScope(query);

        const { data, error, count } = await query;
        if (error) throw error;

        return {
          status: "success",
          code: 200,
          data: (data || []).map((row: any) => this.mapCotizacionDbToUi(row)),
          pagination: {
            total: Number(count || 0),
            page: pageIndex,
            pageSize,
          },
        };
      })());
    }

    return this.http.GetRequest<any>(url);
  }

  eliminarCotizacion(ct_codcoti: string): Observable<any> {
    if (this.useSupabase) {
      return from((async () => {
        const codigo = String(ct_codcoti || "").trim();

        let deleteDetalle = this.db
          .from("detcotizacion")
          .delete()
          .eq("dc_codcoti", codigo);
        deleteDetalle = this.applyDetalleScope(deleteDetalle);
        const { error: detalleError } = await deleteDetalle;
        if (detalleError) throw detalleError;

        let deleteCotizacion = this.db
          .from("cotizacion")
          .delete()
          .eq("ct_codcoti", codigo);
        deleteCotizacion = this.applyCotizacionScope(deleteCotizacion);
        const { error: cotizacionError } = await deleteCotizacion;
        if (cotizacionError) throw cotizacionError;

        return { status: "success", code: 200, data: true };
      })());
    }

    return this.http.DeleteRequest(`/eliminar-cotizacion/${ct_codcoti}`, "");
  }

  // buscarCotizacion(ct_codcoti: string): Observable<any> {
  //   return this.http.GetRequest<any>(`/cotizacion/${ct_codcoti}`);
  // }
  buscarCotizacionPorNombre(currentPage: number, pageSize: number, ct_nomcoti: string, ): Observable<any> {
    if (this.useSupabase) {
      return this.buscarCotizacion(currentPage, pageSize, undefined, ct_nomcoti);
    }

    return this.http.GetRequest<any>(`/cotizacion-nombre/${ct_nomcoti}`);
  }
  buscarCotizacionDetalle(dc_codcoti: string): Observable<any> {
    if (this.useSupabase) {
      return from((async () => {
        const codigo = String(dc_codcoti || "").trim();
        let query = this.db
          .from("detcotizacion")
          .select("*")
          .eq("dc_codcoti", codigo)
          .order("dc_item", { ascending: true });
        query = this.applyDetalleReadScope(query);

        const { data, error } = await query;
        if (error) throw error;

        return {
          status: "success",
          code: 200,
          data: (data || []).map((row: any) => this.mapDetalleDbToUi(row)),
        };
      })());
    }

    return this.http.GetRequest<any>(`/detalle-cotizacion/${dc_codcoti}`);
  }

  getByNumero(numero: string): Observable<any> {
    if (this.useSupabase) {
      return from((async () => {
        const codigo = String(numero || "").trim();
        let cotizacionQuery = this.db
          .from("cotizacion")
          .select("*")
          .eq("ct_codcoti", codigo)
          .limit(1);
        cotizacionQuery = this.applyCotizacionReadScope(cotizacionQuery);
        const { data: cotizacionData, error: cotizacionError } = await cotizacionQuery.maybeSingle();
        if (cotizacionError) throw cotizacionError;

        let detalleQuery = this.db
          .from("detcotizacion")
          .select("*")
          .eq("dc_codcoti", codigo)
          .order("dc_item", { ascending: true });
        detalleQuery = this.applyDetalleReadScope(detalleQuery);
        const { data: detalleData, error: detalleError } = await detalleQuery;
        if (detalleError) throw detalleError;

        return {
          status: cotizacionData ? "success" : "not_found",
          code: cotizacionData ? 200 : 404,
          data: cotizacionData
            ? {
                ...this.mapCotizacionDbToUi(cotizacionData),
                detCotizacion: (detalleData || []).map((row: any) => this.mapDetalleDbToUi(row)),
              }
            : null,
        };
      })());
    }
    console.log('ServicioCotizacion - getByNumero llamado con número:', numero);
    return this.http.GetRequest<any>(`/cotizacion-numero/${numero}`);
     console.log('ServicioFacturacion - getByNumero llamado con número:', numero);
  }
 
 buscarCotizacion(pageIndex: number, pageSize: number, codigo?: string, nomcliente?: string, fecha?:string,): Observable<any> {
    let url = `/cotizacion?page=${pageIndex}&limit=${pageSize}`;
console.log("paso por servicio buscar")
    if (codigo) {
      url += `&codigo=${codigo}`;
    }
    if (nomcliente) {
      url += `&nomcliente=${nomcliente}`;
    }
    if (fecha) {
      url += `&fecha=${fecha}`;
    }
    if (this.useSupabase) {
      return from((async () => {
        const offset = Math.max(pageIndex - 1, 0) * pageSize;
        let query = this.db
          .from("cotizacion")
          .select("*", { count: "exact" })
          .order("ct_feccoti", { ascending: false })
          .order("ct_codcoti", { ascending: false })
          .range(offset, offset + pageSize - 1);
        query = this.applyCotizacionReadScope(query);

        const codigoFiltro = String(codigo || "").trim();
        const clienteFiltro = String(nomcliente || "").trim();
        const fechaFiltro = String(fecha || "").trim();

        if (codigoFiltro) {
          query = query.ilike("ct_codcoti", `%${codigoFiltro}%`);
        }
        if (clienteFiltro) {
          query = query.ilike("ct_nomclie", `%${clienteFiltro}%`);
        }
        if (fechaFiltro) {
          const fechaNormalizada = this.normalizeDate(fechaFiltro);
          if (fechaNormalizada) {
            query = query.eq("ct_feccoti", fechaNormalizada);
          }
        }

        const { data, error, count } = await query;
        if (error) throw error;

        return {
          status: "success",
          code: 200,
          data: (data || []).map((row: any) => this.mapCotizacionDbToUi(row)),
          pagination: {
            total: Number(count || 0),
            page: pageIndex,
            pageSize,
          },
        };
      })());
    }

    return this.http.GetRequest<any>(url);
  }

}
