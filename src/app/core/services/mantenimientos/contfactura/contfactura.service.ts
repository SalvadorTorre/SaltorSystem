import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";
import { SupabaseService } from "../../supabase/supabase.service";

@Injectable({
  providedIn: "root"
})
export class ServicioContFactura {
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

  private toNumberOrNull(value: any): number | null {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private normalizar(row: any): any {
    const id = Number(row?.id ?? row?.idContFact ?? 0);
    return {
      id,
      idContFact: id,
      idsucursal: this.toNumberOrNull(row?.idsucursal ?? row?.idSucursal),
      ano: this.toNumberOrNull(row?.ano),
      contador: this.toNumberOrNull(row?.contador),
      contsalida: this.toNumberOrNull(row?.contsalida),
      contentrada: this.toNumberOrNull(row?.contentrada),
      contvinterna: this.toNumberOrNull(row?.contvinterna),
    };
  }

  private mapPayload(payload: any): any {
    const mapped: any = {
      idsucursal: this.toNumberOrNull(payload?.idsucursal),
      ano: this.toNumberOrNull(payload?.ano),
      contador: this.toNumberOrNull(payload?.contador),
      contsalida: this.toNumberOrNull(payload?.contsalida),
      contentrada: this.toNumberOrNull(payload?.contentrada),
      contvinterna: this.toNumberOrNull(payload?.contvinterna),
    };

    Object.keys(mapped).forEach((k: string) => {
      if (mapped[k] === null || mapped[k] === undefined) {
        delete mapped[k];
      }
    });

    return mapped;
  }

  buscarTodos(
    pageIndex: number,
    pageSize: number,
    sucursal?: string | number
  ): Observable<any> {
    const page = Math.max(Number(pageIndex || 1), 1);
    const limit = Math.max(Number(pageSize || 10), 1);
    const offset = (page - 1) * limit;

    return from(
      (async () => {
        let query = this.db
          .from("contfactura")
          .select("*", { count: "exact" })
          .order("ano", { ascending: false, nullsFirst: false })
          .order("id", { ascending: false })
          .range(offset, offset + limit - 1);

        const sucursalNum = this.toNumberOrNull(sucursal);
        if (sucursalNum !== null) {
          query = query.eq("idsucursal", sucursalNum);
        }

        const { data, error, count } = await query;
        if (error) throw error;

        const rows = (data || []).map((row: any) => this.normalizar(row));

        return {
          rows,
          total: Number(count ?? 0),
          page,
          limit,
        };
      })()
    ).pipe(
      map((result: any) => ({
        status: "success",
        code: 200,
        message: "Contadores obtenidos",
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

  buscarPorSucursal(sucursal: number): Observable<any> {
    return this.buscarTodos(1, 50, sucursal);
  }

  obtenerTodos(): Observable<any> {
    return from(
      (async () => {
        const { data, error } = await this.db
          .from("contfactura")
          .select("*")
          .order("ano", { ascending: false, nullsFirst: false })
          .order("id", { ascending: false });
        if (error) throw error;
        return (data || []).map((row: any) => this.normalizar(row));
      })()
    ).pipe(
      map((rows: any[]) => ({
        status: "success",
        code: 200,
        message: "Contadores obtenidos",
        data: rows,
      }))
    );
  }

  buscarPorId(id: number): Observable<any> {
    return from(
      (async () => {
        const { data, error } = await this.db
          .from("contfactura")
          .select("*")
          .eq("id", Number(id))
          .maybeSingle();
        if (error) throw error;
        return data ? this.normalizar(data) : null;
      })()
    ).pipe(
      map((row: any | null) => ({
        status: "success",
        code: 200,
        message: "Contador encontrado",
        data: row,
      }))
    );
  }

  guardarContFactura(payload: any): Observable<any> {
    const mapped = this.mapPayload(payload);

    return from(
      (async () => {
        const { data, error } = await this.db
          .from("contfactura")
          .insert(mapped)
          .select("*")
          .single();
        if (error) throw error;
        return this.normalizar(data);
      })()
    ).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        message: "Contador creado",
        data: row,
      }))
    );
  }

  editarContFactura(id: number, payload: any): Observable<any> {
    const mapped = this.mapPayload(payload);

    return from(
      (async () => {
        const { data, error } = await this.db
          .from("contfactura")
          .update(mapped)
          .eq("id", Number(id))
          .select("*")
          .maybeSingle();
        if (error) throw error;
        return data ? this.normalizar(data) : null;
      })()
    ).pipe(
      map((row: any | null) => ({
        status: "success",
        code: 200,
        message: "Contador actualizado",
        data: row,
      }))
    );
  }

  eliminarContFactura(id: number): Observable<any> {
    return from(
      (async () => {
        const { error } = await this.db
          .from("contfactura")
          .delete()
          .eq("id", Number(id));
        if (error) throw error;
        return true;
      })()
    ).pipe(
      map(() => ({
        status: "success",
        code: 200,
        message: "Contador eliminado",
      }))
    );
  }
}
