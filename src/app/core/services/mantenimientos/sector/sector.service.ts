import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";
import { SupabaseService } from "../../supabase/supabase.service";
import { ModeloSector } from ".";

@Injectable({
  providedIn: "root"
})
export class ServicioSector {
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

  private mapRow(row: any): any {
    return {
      se_codSect: Number(row?.se_codsect ?? row?.se_codSect ?? 0),
      se_desSect: String(row?.se_dessect ?? row?.se_desSect ?? ""),
      se_codZona: row?.se_codzona !== null && row?.se_codzona !== undefined ? Number(row?.se_codzona) : (row?.se_codZona !== null && row?.se_codZona !== undefined ? Number(row?.se_codZona) : null),
      idsucursal: row?.idsucursal !== null && row?.idsucursal !== undefined ? Number(row?.idsucursal) : null,
    };
  }

  private mapPayload(sector: any): any {
    const payload: any = {
      se_dessect: sector?.se_desSect !== undefined ? String(sector.se_desSect).trim().toUpperCase() : (sector?.se_dessect !== undefined ? String(sector.se_dessect).trim().toUpperCase() : undefined),
      se_codzona: sector?.se_codZona !== undefined && sector?.se_codZona !== null ? Number(sector.se_codZona) : (sector?.se_codzona !== undefined && sector?.se_codzona !== null ? Number(sector.se_codzona) : undefined),
      idsucursal: sector?.idsucursal !== undefined && sector?.idsucursal !== null ? Number(sector.idsucursal) : undefined,
    };
    if (sector?.se_codSect !== undefined && sector?.se_codSect !== null && sector?.se_codSect !== "") {
      payload.se_codsect = Number(sector.se_codSect);
    }
    Object.keys(payload).forEach((key: string) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });
    return payload;
  }

  guardarSector(sector:any): Observable<any>{
    const payload = this.mapPayload(sector);
    return from((async () => {
      const { data, error } = await this.db
        .from("sector")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return this.mapRow(data);
    })()).pipe(
      map((row: any) => ({ status: "success", code: 200, data: row }))
    );
  }

  editarSector(se_codSect:number,sector:ModeloSector): Observable<any>{
    const payload = this.mapPayload(sector);
    delete payload.se_codsect;
    return from((async () => {
      const { data, error } = await this.db
        .from("sector")
        .update(payload)
        .eq("se_codsect", Number(se_codSect))
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data ? this.mapRow(data) : null;
    })()).pipe(
      map((row: any) => ({ status: "success", code: 200, data: row }))
    );
  }
  eliminarSector(se_codSect:number): Observable<any>{
    return from((async () => {
      const { error } = await this.db
        .from("sector")
        .delete()
        .eq("se_codsect", Number(se_codSect));
      if (error) throw error;
      return true;
    })()).pipe(
      map(() => ({ status: "success", code: 200 }))
    );
  }

  buscarTodosSector(pageIndex: number, pageSize: number,   descripcion?: string): Observable<any> {
    const offset = Math.max(pageIndex - 1, 0) * pageSize;
    return from((async () => {
      let query = this.db
        .from("sector")
        .select("*", { count: "exact" })
        .order("se_codsect", { ascending: true })
        .range(offset, offset + pageSize - 1);

      const termino = String(descripcion ?? "").trim();
      if (termino) {
        query = query.ilike("se_dessect", `%${termino}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return {
        rows: (data || []).map((row: any) => this.mapRow(row)),
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
          pageSize,
        }
      }))
    );
  }

  obtenerTodosSector(): Observable<ModeloSector>{
    return from((async () => {
      const { data, error } = await this.db
        .from("sector")
        .select("*")
        .order("se_codsect", { ascending: true });
      if (error) throw error;
      return (data || []).map((row: any) => this.mapRow(row));
    })()).pipe(
      map((rows: any[]) => ({ status: "success", code: 200, message: "", data: rows }))
    );
  }

  buscarPorNombre(nombre: string): Observable<ModeloSector> {
    const term = String(nombre || "").trim();
    return from((async () => {
      if (!term) return [];
      const { data, error } = await this.db
        .from("sector")
        .select("*")
        .ilike("se_dessect", `%${term}%`)
        .order("se_dessect", { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data || []).map((row: any) => this.mapRow(row));
    })()).pipe(
      map((rows: any[]) => ({ status: "success", code: 200, message: "", data: rows }))
    );
  }
}
