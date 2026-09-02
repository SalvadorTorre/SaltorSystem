import { Injectable } from "@angular/core";
import { Observable, from, of } from "rxjs";
import { map } from "rxjs/operators";
import { ModeloCliente, ModeloClienteData } from ".";
import { SupabaseService } from "../../supabase/supabase.service";

@Injectable({
  providedIn: "root"
})
export class ServicioCliente {
  private readonly columnasBusquedaCliente = [
    "cl_codclie",
    "cl_nomclie",
    "cl_dirclie",
    "cl_codsect",
    "cl_sector",
    "cl_codzona",
    "cl_telclie",
    "cl_tipo",
    "cl_limclie",
    "dias",
    "cl_status",
    "cl_rnc",
    "cl_codsucursal",
  ].join(",");

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

  private toBoolean(value: any): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    const normalized = String(value ?? "").trim().toLowerCase();
    return ["true", "1", "s", "si", "y", "yes"].includes(normalized);
  }

  private toNullableNumber(value: any): number | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;
    const numberValue = Number(value);
    return Number.isNaN(numberValue) ? null : numberValue;
  }

  private toNullableString(value: any): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const stringValue = String(value).trim();
    return stringValue ? stringValue : null;
  }

  private sucursalUsuarioValores(): string[] {
    const sucursal = Number(localStorage.getItem("idSucursal") || 0);
    if (!Number.isFinite(sucursal) || sucursal <= 0) return [];

    return Array.from(
      new Set([
        String(sucursal),
        String(sucursal).padStart(2, "0"),
      ]),
    );
  }

  private filtrarPorSucursalUsuario(query: any, filtrar: boolean): any {
    if (!filtrar) return query;
    const sucursales = this.sucursalUsuarioValores();
    return sucursales.length ? query.in("cl_codsucursal", sucursales) : query;
  }

  private normalizarCliente(row: any): ModeloClienteData {
    return {
      cl_codClie: Number(row?.cl_codclie ?? row?.cl_codClie ?? 0),
      cl_nomClie: row?.cl_nomclie ?? row?.cl_nomClie ?? "",
      cl_dirClie: row?.cl_dirclie ?? row?.cl_dirClie ?? "",
      cl_codSect: row?.cl_codsect ?? row?.cl_codSect ?? null,
      cl_sector: row?.cl_sector ?? row?.clSector ?? "",
      cl_codZona: row?.cl_codzona ?? row?.cl_codZona ?? null,
      cl_telClie: row?.cl_telclie ?? row?.cl_telClie ?? "",
      cl_tipo: row?.cl_tipo ?? "",
      cl_limiteCredito: row?.cl_limclie ?? row?.cl_limiteCredito ?? null,
      cl_diasCredito: row?.dias ?? row?.cl_diasCredito ?? null,
      cl_status: this.toBoolean(row?.cl_status),
      cl_rnc: row?.cl_rnc ?? null,
      cl_codSucursal: row?.cl_codsucursal ?? row?.cl_codSucursal ?? null,
      cl_codsucursal: row?.cl_codsucursal ?? row?.cl_codSucursal ?? null,
    } as ModeloClienteData;
  }

  private mapPayloadToDb(cliente: any): any {
    const payload: any = {
      cl_nomclie: this.toNullableString(cliente?.cl_nomClie ?? cliente?.cl_nomclie),
      cl_dirclie: this.toNullableString(cliente?.cl_dirClie ?? cliente?.cl_dirclie),
      cl_codsect: this.toNullableNumber(cliente?.cl_codSect ?? cliente?.cl_codsect),
      cl_sector: this.toNullableString(cliente?.cl_sector ?? cliente?.clSector),
      cl_codzona: this.toNullableNumber(cliente?.cl_codZona ?? cliente?.cl_codzona),
      cl_telclie: this.toNullableString(cliente?.cl_telClie ?? cliente?.cl_telclie),
      cl_tipo: this.toNullableString(cliente?.cl_tipo),
      cl_limclie: this.toNullableNumber(
        cliente?.cl_limiteCredito ?? cliente?.cl_limclie,
      ),
      dias: this.toNullableNumber(
        cliente?.cl_diasCredito ?? cliente?.dias,
      ),
      cl_status:
        cliente?.cl_status !== undefined
          ? (this.toBoolean(cliente?.cl_status) ? 1 : 0)
          : undefined,
      cl_rnc: this.toNullableString(cliente?.cl_rnc),
      cl_codsucursal:
        this.toNullableString(cliente?.cl_codSucursal ?? cliente?.cl_codsucursal),
    };

    Object.keys(payload).forEach((key: string) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    return payload;
  }

  buscarTodosCliente(
    pageIndex: number,
    pageSize: number,
    codigo?: string,
    descripcion?: string,
    filtrarSucursalUsuario = false,
  ): Observable<any> {
    const page = Math.max(Number(pageIndex || 1), 1);
    const limit = Math.max(Number(pageSize || 10), 1);
    const offset = (page - 1) * limit;

    return from(
      (async () => {
        let query = this.db
          .from("clientes")
          .select("*", { count: "exact" })
          .order("cl_codclie", { ascending: true })
          .range(offset, offset + limit - 1);
        query = this.filtrarPorSucursalUsuario(query, filtrarSucursalUsuario);

        const codigoTxt = String(codigo || "").trim();
        if (codigoTxt) {
          const codigoNum = Number(codigoTxt);
          if (!Number.isNaN(codigoNum)) {
            query = query.eq("cl_codclie", codigoNum);
          }
        }

        const descTxt = String(descripcion || "").trim();
        if (descTxt) {
          query = query.ilike("cl_nomclie", `%${descTxt}%`);
        }

        const { data, error, count } = await query;
        if (error) throw error;

        return {
          rows: (data || []).map((row: any) => this.normalizarCliente(row)),
          total: Number(count ?? 0),
          page,
          limit,
        };
      })()
    ).pipe(
      map((result: any) => ({
        status: "success",
        code: 200,
        message: "Clientes obtenidos",
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

  guardarCliente(cliente: ModeloClienteData): Observable<any> {
    const payload = this.mapPayloadToDb(cliente);

    return from(
      (async () => {
        const rnc = String(payload?.cl_rnc || "").replace(/\D/g, "").trim();
        if (rnc) {
          let duplicadoQuery = this.db
            .from("clientes")
            .select("cl_codclie")
            .eq("cl_rnc", rnc)
            .limit(1);
          const sucursales = this.sucursalUsuarioValores();
          if (sucursales.length) {
            duplicadoQuery = duplicadoQuery.in("cl_codsucursal", sucursales);
          }
          const { data: duplicados, error: duplicadoError } = await duplicadoQuery;
          if (duplicadoError) throw duplicadoError;
          if (Array.isArray(duplicados) && duplicados.length > 0) {
            throw new Error(`Ya existe un cliente registrado con el RNC ${rnc}.`);
          }
        }

        // No solicitar una representacion de la fila insertada. Con RLS puede
        // estar permitido INSERT pero la fila no ser visible inmediatamente
        // para SELECT; en ese caso .single() producia PGRST116 aunque el
        // cliente se hubiera guardado correctamente.
        const { error } = await this.db
          .from("clientes")
          .insert(payload);
        if (error) {
          if (String(error?.code || "") === "23505") {
            throw new Error("Este cliente ya se encuentra registrado.");
          }
          throw error;
        }
        return this.normalizarCliente(payload);
      })()
    ).pipe(
      map((row: ModeloClienteData) => ({
        status: "success",
        code: 200,
        message: "Cliente guardado",
        data: row,
      }))
    );
  }

  buscarNombrePorRnc(rnc: string): Observable<string | null> {
    const numero = String(rnc || "").replace(/\D/g, "").trim();
    if (!numero) return of(null);

    return from(
      (async () => {
        const { data, error } = await this.db
          .from("rnc")
          .select("rason")
          .eq("rnc", numero)
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        const nombre = String(data?.rason || "").trim();
        return nombre || null;
      })()
    );
  }

  editarCliente(cl_codClie: number, cliente: ModeloClienteData): Observable<any> {
    const payload = this.mapPayloadToDb(cliente);

    return from(
      (async () => {
        let query = this.db
          .from("clientes")
          .update(payload)
          .eq("cl_codclie", Number(cl_codClie));
        query = this.filtrarPorSucursalUsuario(query, true);
        const { error } = await query;
        if (error) throw error;
        return this.normalizarCliente({
          ...payload,
          cl_codclie: Number(cl_codClie),
        });
      })()
    ).pipe(
      map((row: ModeloClienteData) => ({
        status: "success",
        code: 200,
        message: "Cliente actualizado",
        data: row,
      }))
    );
  }

  eliminarCliente(cl_codClie: number): Observable<any> {
    return from(
      (async () => {
        let query = this.db
          .from("clientes")
          .delete()
          .eq("cl_codclie", Number(cl_codClie));
        query = this.filtrarPorSucursalUsuario(query, true);
        const { error } = await query;
        if (error) throw error;
        return true;
      })()
    ).pipe(
      map(() => ({
        status: "success",
        code: 200,
        message: "Cliente eliminado",
      }))
    );
  }

  buscarCliente(cl_codClie: number): Observable<any> {
    return from(
      (async () => {
        let query = this.db
          .from("clientes")
          .select("*")
          .eq("cl_codclie", Number(cl_codClie));
        query = this.filtrarPorSucursalUsuario(query, true)
          .limit(1);
        const { data, error } = await query.maybeSingle();
        if (error) throw error;
        return data ? this.normalizarCliente(data) : null;
      })()
    ).pipe(
      map((row: ModeloClienteData | null) => ({
        status: "success",
        code: 200,
        message: "Cliente encontrado",
        data: row,
      }))
    );
  }

  buscarporNombre(nombre: string, filtrarSucursalUsuario = false): Observable<ModeloCliente> {
    const term = String(nombre || "").trim();

    return from(
      (async () => {
        if (!term) return [];

        let query = this.db
          .from("clientes")
          .select(this.columnasBusquedaCliente)
          .ilike("cl_nomclie", `%${term}%`);
        query = this.filtrarPorSucursalUsuario(query, filtrarSucursalUsuario);
        query = query
          .order("cl_nomclie", { ascending: true })
          .limit(50);

        const { data, error } = await query;

        if (error) throw error;

        return (data || []).map((row: any) => this.normalizarCliente(row));
      })()
    ).pipe(
      map((rows: ModeloClienteData[]) => ({
        status: "success",
        code: 200,
        message: "Clientes encontrados",
        data: rows,
        pagination: {
          total: rows.length,
          page: 1,
          limit: rows.length,
          totalPages: 1,
        },
      }))
    );
  }

  buscarPorRnc(rnc: string, filtrarSucursalUsuario = false): Observable<any> {
    const limpio = String(rnc || "").replace(/\D/g, "").trim();
    if (!limpio) {
      return of({
        status: "success",
        code: 200,
        message: "RNC vacío",
        data: null,
      });
    }

    return from(
      (async () => {
        const rncNumero = Number(limpio);
        if (Number.isNaN(rncNumero)) return null;

        let query = this.db
          .from("clientes")
          .select("*")
          .eq("cl_rnc", rncNumero);
        query = this.filtrarPorSucursalUsuario(query, filtrarSucursalUsuario);
        query = query
          .order("cl_codclie", { ascending: true })
          .limit(1);

        const { data, error } = await query.maybeSingle();

        if (error) throw error;
        return data ? this.normalizarCliente(data) : null;
      })()
    ).pipe(
      map((row: ModeloClienteData | null) => ({
        status: "success",
        code: 200,
        message: "Cliente por RNC",
        data: row,
      }))
    );
  }
}
