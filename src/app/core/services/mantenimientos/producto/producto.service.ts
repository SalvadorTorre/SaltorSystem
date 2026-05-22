import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";
import { SupabaseService } from "../../supabase/supabase.service";

@Injectable({
  providedIn: "root"
})
export class ServicioProducto {
  constructor(private supabase: SupabaseService) {}

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

  private mapDbToUi(row: any): any {
    if (!row) return row;
    return {
      ...row,
      codigo: row?.in_codmerc ?? "",
      descripcion: row?.in_desmerc ?? "",
      in_grumerc: row?.in_grumerc ?? row?.in_categor ?? "",
      in_tipoproduct: row?.in_tipoproduct ?? row?.in_tramo ?? "",
      in_cosmerc: row?.in_cosmerc ?? row?.in_costmer ?? 0,
      in_longitud: row?.in_longitud ?? row?.in_longitu ?? 0,
      in_medida: row?.in_medida ?? row?.media ?? "",
      in_fecmodif: row?.in_fecmodif ?? row?.in_fecmodi ?? null,
      in_amacen: row?.in_amacen ?? row?.in_almacen ?? "",
      in_imagen: row?.in_imagen ?? row?.imagen ?? "",
      in_status: row?.in_status ?? row?.status ?? "",
      in_costmer: row?.in_costmer ?? row?.in_cosmerc ?? 0,
    };
  }

  private mapUiToDb(payload: any): any {
    const mapped: any = {
      in_codmerc: payload?.in_codmerc ?? payload?.codigo ?? undefined,
      in_categor: payload?.in_grumerc ?? payload?.in_categor ?? undefined,
      in_tramo: payload?.in_tipoproduct ?? payload?.in_tramo ?? undefined,
      in_desmerc: payload?.in_desmerc ?? payload?.descripcion ?? undefined,
      in_canmerc:
        payload?.in_canmerc !== undefined ? this.toNumber(payload.in_canmerc) : undefined,
      in_caninve:
        payload?.in_caninve !== undefined ? this.toNumber(payload.in_caninve) : undefined,
      in_fecinve: payload?.in_fecinve ?? undefined,
      in_eximini:
        payload?.in_eximini !== undefined ? this.toNumber(payload.in_eximini) : undefined,
      in_minvent:
        payload?.in_minvent !== undefined ? this.toNumber(payload.in_minvent) : undefined,
      in_costmer:
        payload?.in_costmer !== undefined
          ? this.toNumber(payload.in_costmer)
          : payload?.in_cosmerc !== undefined
            ? this.toNumber(payload.in_cosmerc)
            : undefined,
      in_precmin:
        payload?.in_precmin !== undefined ? this.toNumber(payload.in_precmin) : undefined,
      in_premerc:
        payload?.in_premerc !== undefined ? this.toNumber(payload.in_premerc) : undefined,
      in_costpro:
        payload?.in_costpro !== undefined ? this.toNumber(payload.in_costpro) : undefined,
      in_ucosto:
        payload?.in_ucosto !== undefined ? this.toNumber(payload.in_ucosto) : undefined,
      in_porgana:
        payload?.in_porgana !== undefined ? this.toNumber(payload.in_porgana) : undefined,
      in_peso: payload?.in_peso !== undefined ? this.toNumber(payload.in_peso) : undefined,
      media: payload?.in_medida ?? payload?.media ?? undefined,
      in_longitu:
        payload?.in_longitud !== undefined
          ? this.toNumber(payload.in_longitud)
          : payload?.in_longitu !== undefined
            ? this.toNumber(payload.in_longitu)
            : undefined,
      in_unidad: payload?.in_unidad ?? undefined,
      in_fecmodi: payload?.in_fecmodif ?? payload?.in_fecmodi ?? undefined,
      in_almacen: payload?.in_amacen ?? payload?.in_almacen ?? undefined,
      imagen: payload?.in_imagen ?? payload?.imagen ?? undefined,
      in_exento: payload?.in_exento ?? undefined,
      contror: payload?.contror ?? undefined,
      atualisar: payload?.atualisar ?? undefined,
      suma: payload?.suma !== undefined ? this.toNumber(payload.suma) : undefined,
      existencia:
        payload?.existencia !== undefined ? this.toNumber(payload.existencia) : undefined,
      salida: payload?.salida !== undefined ? this.toNumber(payload.salida) : undefined,
      status: payload?.in_status ?? payload?.status ?? undefined,
    };

    Object.keys(mapped).forEach((key: string) => {
      if (mapped[key] === undefined) {
        delete mapped[key];
      }
    });

    return mapped;
  }

  obtenerProductos(
    pageIndex: number,
    pageSize: number,
    codigo?: string,
    descripcion?: string
  ): Observable<any> {
    const page = Math.max(Number(pageIndex || 1), 1);
    const limit = Math.max(Number(pageSize || 10), 1);
    const offset = (page - 1) * limit;

    return from(
      (async () => {
        let query = this.db
          .from("productos2")
          .select("*", { count: "exact" })
          .order("id", { ascending: false })
          .range(offset, offset + limit - 1);

        const cod = String(codigo || "").trim();
        if (cod) {
          query = query.ilike("in_codmerc", `%${cod}%`);
        }

        const desc = String(descripcion || "").trim();
        if (desc) {
          query = query.ilike("in_desmerc", `%${desc}%`);
        }

        const { data, error, count } = await query;
        if (error) throw error;

        return {
          rows: (data || []).map((row: any) => this.mapDbToUi(row)),
          total: Number(count ?? 0),
          page,
          limit,
        };
      })()
    ).pipe(
      map((result: any) => ({
        status: "success",
        code: 200,
        message: "Productos obtenidos",
        data: result.rows,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.max(1, Math.ceil(result.total / result.limit)),
        },
      }))
    );
  }

  obtenerProductoPorId(in_codmerc: string | number): Observable<any> {
    const codigo = String(in_codmerc || "").trim();

    return from(
      (async () => {
        if (!codigo) {
          return null;
        }

        let row: any = null;

        const byCode = await this.db
          .from("productos2")
          .select("*")
          .eq("in_codmerc", codigo)
          .limit(1)
          .maybeSingle();

        if (byCode.error) throw byCode.error;
        row = byCode.data;

        if (!row) {
          const asNumber = Number(codigo);
          if (!Number.isNaN(asNumber)) {
            const byId = await this.db
              .from("productos2")
              .select("*")
              .eq("id", asNumber)
              .limit(1)
              .maybeSingle();
            if (byId.error) throw byId.error;
            row = byId.data;
          }
        }

        return row ? this.mapDbToUi(row) : null;
      })()
    ).pipe(
      map((row: any | null) => ({
        status: "success",
        code: 200,
        message: "Producto obtenido",
        data: row,
      }))
    );
  }

  crearProducto(payload: any): Observable<any> {
    const mapped = this.mapUiToDb(payload);

    return from(
      (async () => {
        const { data, error } = await this.db
          .from("productos2")
          .insert(mapped)
          .select("*")
          .single();

        if (error) throw error;
        return this.mapDbToUi(data);
      })()
    ).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        message: "Producto creado",
        data: row,
      }))
    );
  }

  eliminarProducto(in_codmerc: string | number): Observable<any> {
    const codigo = String(in_codmerc || "").trim();

    return from(
      (async () => {
        const { error } = await this.db
          .from("productos2")
          .delete()
          .eq("in_codmerc", codigo);

        if (error) throw error;
        return true;
      })()
    ).pipe(
      map(() => ({
        status: "success",
        code: 200,
        message: "Producto eliminado",
      }))
    );
  }

  buscarProductosPorCodigo(in_codmerc: string): Observable<any> {
    const codigo = String(in_codmerc || "").trim();

    return from(
      (async () => {
        if (!codigo) {
          return [];
        }

        const { data, error } = await this.db
          .from("productos2")
          .select("*")
          .ilike("in_codmerc", `%${codigo}%`)
          .order("in_codmerc", { ascending: true })
          .limit(50);

        if (error) throw error;

        return (data || []).map((row: any) => this.mapDbToUi(row));
      })()
    ).pipe(
      map((rows: any[]) => ({
        status: "success",
        code: 200,
        message: "Productos por código",
        data: rows,
      }))
    );
  }

  buscarProductos(codigo: string): Observable<any[]> {
    return this.buscarProductosPorCodigo(codigo).pipe(
      map((resp: any) => (Array.isArray(resp?.data) ? resp.data : []))
    );
  }

  buscarProductosPorDescripcion(in_desmerc: string): Observable<any> {
    const descripcion = String(in_desmerc || "").trim();

    return from(
      (async () => {
        if (!descripcion) {
          return [];
        }

        const { data, error } = await this.db
          .from("productos2")
          .select("*")
          .ilike("in_desmerc", `%${descripcion}%`)
          .order("in_desmerc", { ascending: true })
          .limit(50);

        if (error) throw error;

        return (data || []).map((row: any) => this.mapDbToUi(row));
      })()
    ).pipe(
      map((rows: any[]) => ({
        status: "success",
        code: 200,
        message: "Productos por descripción",
        data: rows,
      }))
    );
  }
}
