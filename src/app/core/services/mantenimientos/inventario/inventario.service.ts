import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";
import { ModeloInventarioData } from ".";
import { SupabaseService } from "../../supabase/supabase.service";

@Injectable({
  providedIn: "root"
})
export class ServicioInventario {
  private readonly fetchBatchSize = 1000;

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

  private toNullableNumber(value: any): number | null {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private uniqueCodes(rows: any[]): Set<string> {
    return new Set(
      (rows || [])
        .map((row: any) => String(row?.inv_codprod || "").trim())
        .filter((code: string) => !!code)
    );
  }

  private async fetchAllRows(
    table: string,
    selectClause: string,
    configure?: (query: any) => any
  ): Promise<any[]> {
    const rows: any[] = [];
    let from = 0;

    while (true) {
      let query = this.db
        .from(table)
        .select(selectClause)
        .range(from, from + this.fetchBatchSize - 1);

      if (configure) {
        query = configure(query);
      }

      const { data, error } = await query;
      if (error) throw error;

      const batch = data || [];
      rows.push(...batch);

      if (batch.length < this.fetchBatchSize) {
        break;
      }

      from += this.fetchBatchSize;
    }

    return rows;
  }

  private async insertInBatches(table: string, rows: any[]): Promise<number> {
    let inserted = 0;

    for (let from = 0; from < rows.length; from += this.fetchBatchSize) {
      const batch = rows.slice(from, from + this.fetchBatchSize);
      if (!batch.length) continue;

      const { error } = await this.db.from(table).insert(batch);
      if (error) throw error;

      inserted += batch.length;
    }

    return inserted;
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
      const descripcionInicial = String(descripcion || "").trim();

      const { data, error } = await this.db
        .from("productos2")
        .select("*")
        .ilike("in_desmerc", `${descripcionInicial}%`)
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

  obtenerInventarioPorProducto(codigo: string): Observable<any> {
    const cod = String(codigo || "").trim();
    return from((async () => {
      const { data, error } = await this.db
        .from("inventario")
        .select("*")
        .eq("inv_codprod", cod)
        .order("inv_codsucu", { ascending: true });
      if (error) throw error;
      return data || [];
    })()).pipe(
      map((rows: any[]) => ({ status: "success", code: 200, data: rows }))
    );
  }

  obtenerInventarioPorSucursal(
    sucursal: number | string,
    pageIndex: number,
    pageSize: number,
    codigo?: string,
    descripcion?: string
  ): Observable<any> {
    const inv_codsucu = Number(sucursal);
    const page = Math.max(Number(pageIndex || 1), 1);
    const limit = Math.max(Number(pageSize || 10), 1);
    const offset = (page - 1) * limit;

    return from((async () => {
      if (!inv_codsucu || Number.isNaN(inv_codsucu)) {
        return {
          rows: [],
          total: 0,
        };
      }

      let query = this.db
        .from("inventario")
        .select("*", { count: "exact" })
        .eq("inv_codsucu", inv_codsucu)
        .order("inv_codprod", { ascending: true })
        .range(offset, offset + limit - 1);

      const codigoFiltro = String(codigo || "").trim();
      const descripcionFiltro = String(descripcion || "").trim();

      if (codigoFiltro) {
        query = query.ilike("inv_codprod", `%${codigoFiltro}%`);
      }

      if (descripcionFiltro) {
        query = query.ilike("inv_desprod", `%${descripcionFiltro}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        rows: data || [],
        total: Number(count || 0),
      };
    })()).pipe(
      map((result: { rows: any[]; total: number }) => ({
        status: "success",
        code: 200,
        data: result.rows,
        pagination: {
          total: result.total,
          page,
          pageSize: limit,
        },
      }))
    );
  }

  guardarInventarioSucursal(payload: {
    inv_codsucu: number;
    inv_codprod: string;
    inv_desprod?: string | null;
    inv_cosprod?: number | null;
    inv_preprod?: number | null;
    inv_existencia?: number | null;
    activo?: boolean | null;
  }): Observable<any> {
    return from((async () => {
      const inv_codsucu = Number(payload?.inv_codsucu);
      const inv_codprod = String(payload?.inv_codprod || "").trim();
      if (!inv_codsucu || !inv_codprod) {
        throw new Error("Sucursal y código de producto son requeridos");
      }

      const body: any = {
        inv_codsucu,
        inv_codprod,
        inv_desprod: payload?.inv_desprod ?? null,
        inv_cosprod: this.toNullableNumber(payload?.inv_cosprod),
        inv_preprod: this.toNullableNumber(payload?.inv_preprod),
        inv_existencia: this.toNumber(payload?.inv_existencia ?? 0),
        inv_fechamov: new Date().toISOString(),
      };

      if (payload?.activo !== undefined && payload?.activo !== null) {
        body.activo = !!payload.activo;
      }

      const { data: current, error: findError } = await this.db
        .from("inventario")
        .select("*")
        .eq("inv_codsucu", inv_codsucu)
        .eq("inv_codprod", inv_codprod)
        .limit(1)
        .maybeSingle();
      if (findError) throw findError;

      if (current) {
        const updatePayload = { ...body };
        delete updatePayload.inv_codsucu;
        delete updatePayload.inv_codprod;
        const { data, error } = await this.db
          .from("inventario")
          .update(updatePayload)
          .eq("id", Number(current.id))
          .eq("inv_codsucu", inv_codsucu)
          .eq("inv_codprod", inv_codprod)
          .select("*")
          .maybeSingle();
        if (error) throw error;
        return data;
      }

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

  sembrarInventarioSucursalDesdeCatalogo(payload: {
    inv_codsucu: number | string;
    sobrescribirExistentes?: boolean;
    existenciaInicial?: number | null;
  }): Observable<any> {
    return from((async () => {
      const inv_codsucu = Number(payload?.inv_codsucu);
      if (!inv_codsucu || Number.isNaN(inv_codsucu)) {
        throw new Error("Sucursal inválida para sembrar inventario");
      }

      const sobrescribirExistentes = !!payload?.sobrescribirExistentes;
      const existenciaInicial = this.toNumber(payload?.existenciaInicial ?? 0);

      const [productos, inventarioActual] =
        await Promise.all([
          this.fetchAllRows(
            "productos2",
            "in_codmerc,in_desmerc,in_costmer,in_premerc,status",
            (query: any) => query.order("in_codmerc", { ascending: true })
          ),
          this.fetchAllRows(
            "inventario",
            "id,inv_codprod,inv_codsucu",
            (query: any) => query.eq("inv_codsucu", inv_codsucu)
          ),
        ]);

      const catalogo = (productos || []).filter((item: any) => String(item?.in_codmerc || "").trim());
      const existentes = this.uniqueCodes(inventarioActual || []);

      const rowsToInsert = catalogo
        .filter((producto: any) => sobrescribirExistentes || !existentes.has(String(producto.in_codmerc).trim()))
        .map((producto: any) => ({
          inv_codsucu,
          inv_codprod: String(producto.in_codmerc || "").trim(),
          inv_desprod: String(producto.in_desmerc || "").trim() || null,
          inv_cosprod: this.toNullableNumber(producto?.in_costmer ?? producto?.in_cosmerc),
          inv_preprod: this.toNullableNumber(producto?.in_premerc),
          inv_existencia: existenciaInicial,
          inv_fechamov: new Date().toISOString(),
          activo: String(producto?.status ?? producto?.in_status ?? "A").trim().toUpperCase() !== "I",
        }));

      let inserted = 0;
      if (sobrescribirExistentes) {
        const { error: deleteError } = await this.db
          .from("inventario")
          .delete()
          .eq("inv_codsucu", inv_codsucu);
        if (deleteError) throw deleteError;
      }

      if (rowsToInsert.length > 0) {
        inserted = await this.insertInBatches("inventario", rowsToInsert);
      }

      const totalCatalogo = catalogo.length;
      const totalFinal = sobrescribirExistentes
        ? inserted
        : this.uniqueCodes([...(inventarioActual || []), ...rowsToInsert]).size;

      return {
        sucursal: inv_codsucu,
        totalCatalogo,
        totalAntes: this.uniqueCodes(inventarioActual || []).size,
        totalDespues: totalFinal,
        insertados: inserted,
        faltantes: Math.max(totalCatalogo - totalFinal, 0),
        modo: sobrescribirExistentes ? "reemplazo" : "faltantes",
      };
    })()).pipe(
      map((data: any) => ({ status: "success", code: 200, data }))
    );
  }

  obtenerResumenInventarioSucursales(idsSucursales?: Array<number | string>): Observable<any> {
    return from((async () => {
      const ids = (idsSucursales || [])
        .map((value) => Number(value))
        .filter((value) => !!value && !Number.isNaN(value));

      const [{ count: totalCatalogo, error: countError }, inventarioRows] =
        await Promise.all([
          this.db.from("productos2").select("id", { count: "exact", head: true }),
          this.fetchAllRows(
            "inventario",
            "inv_codsucu,inv_codprod",
            (query: any) => (ids.length ? query.in("inv_codsucu", ids) : query)
          ),
        ]);

      if (countError) throw countError;

      const grouped = new Map<number, Set<string>>();
      (inventarioRows || []).forEach((row: any) => {
        const sucursal = Number(row?.inv_codsucu || 0);
        const codigo = String(row?.inv_codprod || "").trim();
        if (!sucursal || !codigo) return;
        if (!grouped.has(sucursal)) {
          grouped.set(sucursal, new Set<string>());
        }
        grouped.get(sucursal)!.add(codigo);
      });

      return {
        totalCatalogo: Number(totalCatalogo || 0),
        sucursales: Array.from(grouped.entries()).map(([inv_codsucu, codes]) => ({
          inv_codsucu,
          totalInventario: codes.size,
          faltantes: Math.max(Number(totalCatalogo || 0) - codes.size, 0),
        })),
      };
    })()).pipe(
      map((data: any) => ({ status: "success", code: 200, data }))
    );
  }

  obtenerCoberturaSucursalesPorProductos(
    codigos: Array<string | number>,
    totalSucursales: number
  ): Observable<any> {
    return from((async () => {
      const codes = Array.from(
        new Set(
          (codigos || [])
            .map((value) => String(value || "").trim())
            .filter((value) => !!value)
        )
      );

      if (!codes.length) {
        return [];
      }

      const { data, error } = await this.db
        .from("inventario")
        .select("inv_codprod,inv_codsucu")
        .in("inv_codprod", codes);
      if (error) throw error;

      const grouped = new Map<string, Set<number>>();
      (data || []).forEach((row: any) => {
        const codigo = String(row?.inv_codprod || "").trim();
        const sucursal = Number(row?.inv_codsucu || 0);
        if (!codigo || !sucursal) return;
        if (!grouped.has(codigo)) {
          grouped.set(codigo, new Set<number>());
        }
        grouped.get(codigo)!.add(sucursal);
      });

      return codes.map((codigo) => {
        const sucursales = grouped.get(codigo) || new Set<number>();
        return {
          in_codmerc: codigo,
          sucursales_cargadas: sucursales.size,
          sucursales_totales: totalSucursales,
          inventario_completo: totalSucursales > 0 && sucursales.size >= totalSucursales,
        };
      });
    })()).pipe(
      map((rows: any[]) => ({ status: "success", code: 200, data: rows }))
    );
  }
}
