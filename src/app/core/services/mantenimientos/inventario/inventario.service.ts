import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";
import { ModeloInventarioData } from ".";
import { SupabaseService } from "../../supabase/supabase.service";

@Injectable({
  providedIn: "root"
})
export class ServicioInventario {
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
      in_grumerc: row?.in_grumerc ?? row?.in_categor ?? "",
      in_tipoproduct: row?.in_tipoproduct ?? row?.in_tramo ?? "",
      in_cosmerc: row?.in_cosmerc ?? row?.in_costmer ?? 0,
      in_longitud: row?.in_longitud ?? row?.in_longitu ?? 0,
      in_medida: row?.in_medida ?? row?.media ?? "",
      in_fecmodif: row?.in_fecmodif ?? row?.in_fecmodi ?? null,
      in_amacen: row?.in_amacen ?? row?.in_almacen ?? "",
      in_imagen: row?.in_imagen ?? row?.imagen ?? "",
      in_status: row?.in_status ?? row?.status ?? ""
    };
  }

  private mapUiToDb(inventario: any): any {
    const payload: any = {
      in_codmerc: inventario?.in_codmerc ?? undefined,
      in_desmerc: inventario?.in_desmerc ?? undefined,
      in_categor: inventario?.in_grumerc ?? inventario?.in_categor ?? undefined,
      in_tramo: inventario?.in_tipoproduct ?? inventario?.in_tramo ?? undefined,
      in_canmerc: inventario?.in_canmerc !== undefined ? this.toNumber(inventario.in_canmerc) : undefined,
      in_caninve: inventario?.in_caninve !== undefined ? this.toNumber(inventario.in_caninve) : undefined,
      in_fecinve: inventario?.in_fecinve ?? undefined,
      in_eximini: inventario?.in_eximini !== undefined ? this.toNumber(inventario.in_eximini) : undefined,
      in_minvent: inventario?.in_minvent !== undefined ? this.toNumber(inventario.in_minvent) : undefined,
      in_costmer: inventario?.in_cosmerc !== undefined ? this.toNumber(inventario.in_cosmerc) : undefined,
      in_precmin: inventario?.in_precmin !== undefined ? this.toNumber(inventario.in_precmin) : undefined,
      in_premerc: inventario?.in_premerc !== undefined ? this.toNumber(inventario.in_premerc) : undefined,
      in_costpro: inventario?.in_costpro !== undefined ? this.toNumber(inventario.in_costpro) : undefined,
      in_ucosto: inventario?.in_ucosto !== undefined ? this.toNumber(inventario.in_ucosto) : undefined,
      in_porgana: inventario?.in_porgana !== undefined ? this.toNumber(inventario.in_porgana) : undefined,
      in_peso: inventario?.in_peso !== undefined ? this.toNumber(inventario.in_peso) : undefined,
      in_longitu: inventario?.in_longitud !== undefined ? this.toNumber(inventario.in_longitud) : undefined,
      in_unidad: inventario?.in_unidad ?? undefined,
      media: inventario?.in_medida ?? inventario?.media ?? undefined,
      in_fecmodi: inventario?.in_fecmodif ?? inventario?.in_fecmodi ?? undefined,
      in_almacen: inventario?.in_amacen ?? inventario?.in_almacen ?? undefined,
      imagen: inventario?.in_imagen ?? inventario?.imagen ?? undefined,
      status: inventario?.in_status ?? inventario?.status ?? undefined
    };

    Object.keys(payload).forEach((key: string) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    return payload;
  }

  guardarInventario(inventario:ModeloInventarioData): Observable<any>{
    const payload = this.mapUiToDb(inventario);
    return from((async () => {
      const { data, error } = await this.db
        .from("productos2")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        data: this.mapDbToUi(row)
      }))
    );
  }

  editarInventario(in_codmerc:string | number,inventario:ModeloInventarioData): Observable<any>{
    const payload: any = this.mapUiToDb(inventario);
    delete payload.in_codmerc;

    const idEdit = Number((inventario as any)?.id || 0);
    const cod = String((inventario as any)?.in_codmerc || in_codmerc || "").trim();

    return from((async () => {
      let query = this.db.from("productos2").update(payload);
      if (idEdit > 0) {
        query = query.eq("id", idEdit);
      } else if (cod) {
        query = query.eq("in_codmerc", cod);
      } else {
        throw new Error("No se encontró identificador para editar producto");
      }

      const { data, error } = await query.select("*").maybeSingle();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        data: row ? this.mapDbToUi(row) : null
      }))
    );
  }

  obtenerTodosInventario(pageIndex: number, pageSize: number, codigo?: string, descripcion?: string): Observable<any> {
    const offset = Math.max(pageIndex - 1, 0) * pageSize;
    return from((async () => {
      let query = this.db
        .from("productos2")
        .select("*", { count: "exact" })
        .order("id", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (codigo) {
        query = query.ilike("in_codmerc", `%${codigo}%`);
      }
      if (descripcion) {
        query = query.ilike("in_desmerc", `%${descripcion}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return {
        rows: (data || []).map((row: any) => this.mapDbToUi(row)),
        total: Number(count ?? 0)
      };
    })()).pipe(
      map((result: { rows: any[]; total: number }) => ({
        status: "success",
        code: 200,
        data: result.rows,
        pagination: {
          total: result.total,
          page: pageIndex,
          pageSize
        }
      }))
    );
  }

  borrarDeInventario(in_codmerc:string | number): Observable<any>{
    const codigo = String(in_codmerc || "").trim();
    return from((async () => {
      const { error } = await this.db
        .from("productos2")
        .delete()
        .eq("in_codmerc", codigo);
      if (error) throw error;
      return true;
    })()).pipe(
      map(() => ({ status: "success", code: 200 }))
    );
  }

  buscarporCodigoMerc(codigo:string): Observable<any>{
    return from((async () => {
      const { data, error } = await this.db
        .from("productos2")
        .select("*")
        .ilike("in_codmerc", `%${codigo}%`)
        .order("in_codmerc", { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data || []).map((row: any) => this.mapDbToUi(row));
    })()).pipe(
      map((rows: any[]) => ({ status: "success", code: 200, data: rows }))
    );
  }

  buscarPorDescripcionMerc(descripcion:string): Observable<any>{
    return from((async () => {
      const { data, error } = await this.db
        .from("productos2")
        .select("*")
        .ilike("in_desmerc", `%${descripcion}%`)
        .order("in_desmerc", { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data || []).map((row: any) => this.mapDbToUi(row));
    })()).pipe(
      map((rows: any[]) => ({ status: "success", code: 200, data: rows }))
    );
  }
 
  obtenerProductoPorId(codigo: string): Observable<any> {
    const cod = String(codigo || "").trim();
    return from((async () => {
      const { data, error } = await this.db
        .from("productos2")
        .select("*")
        .eq("in_codmerc", cod)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ? this.mapDbToUi(data) : null;
    })()).pipe(
      map((row: any) => ({ status: "success", code: 200, data: row }))
    );
  }

  ajustarExistencia(payload: { inv_codsucu: number; inv_codprod: string; cantidad: number; tipo_movimiento: 'entrada' | 'salida'; }): Observable<any> {
    return from((async () => {
      const cantidadActual = this.toNumber(payload?.cantidad);
      const movimiento = payload?.tipo_movimiento === "salida" ? -Math.abs(cantidadActual) : Math.abs(cantidadActual);

      const { data: current, error: currentError } = await this.db
        .from("inventario")
        .select("*")
        .eq("inv_codsucu", Number(payload.inv_codsucu))
        .eq("inv_codprod", String(payload.inv_codprod))
        .limit(1)
        .maybeSingle();
      if (currentError) throw currentError;

      if (!current) {
        throw new Error("No existe inventario para ese producto y sucursal");
      }

      const existenciaNueva = this.toNumber(current.inv_existencia) + movimiento;
      const { data, error } = await this.db
        .from("inventario")
        .update({
          inv_existencia: existenciaNueva,
          inv_fechamov: new Date().toISOString()
        })
        .eq("id", Number(current.id))
        .eq("inv_codsucu", Number(payload.inv_codsucu))
        .eq("inv_codprod", String(payload.inv_codprod))
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({ status: "success", code: 200, data: row }))
    );
  }

  crearInventario(payload: { inv_codsucu: number; inv_codprod: string; inv_existencia: number; inv_desprod?: string | null; inv_cosprod?: number | null; inv_preprod?: number | null; }): Observable<any> {
    return from((async () => {
      const body = {
        inv_codsucu: Number(payload.inv_codsucu),
        inv_codprod: String(payload.inv_codprod || "").trim(),
        inv_existencia: this.toNumber(payload.inv_existencia),
        inv_desprod: payload.inv_desprod ?? null,
        inv_cosprod: payload.inv_cosprod ?? null,
        inv_preprod: payload.inv_preprod ?? null,
        inv_fechamov: new Date().toISOString()
      };
      const { data, error } = await this.db
        .from("inventario")
        .insert(body)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({ status: "success", code: 200, data: row }))
    );
  }

  obtenerExistenciaPorProductoSucursal(codigo: string, sucursal: number | string): Observable<any> {
    const cod = String(codigo || "").trim();
    const suc = Number(sucursal);
    return from((async () => {
      const { data, error } = await this.db
        .from("inventario")
        .select("*")
        .eq("inv_codprod", cod)
        .eq("inv_codsucu", suc)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    })()).pipe(
      map((row: any) => ({ status: "success", code: 200, data: row }))
    );
  }

  buscarInventario(codsucu: number, buscar: string) {
    const texto = String(buscar || "").trim();
    return from((async () => {
      let query = this.db
        .from("inventario")
        .select("*")
        .eq("inv_codsucu", Number(codsucu))
        .order("id", { ascending: false });

      if (texto) {
        query = query.or(`inv_codprod.ilike.%${texto}%,inv_desprod.ilike.%${texto}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data || [];
    })()).pipe(
      map((rows: any[]) => ({ status: "success", code: 200, data: rows }))
    );
  }
}
