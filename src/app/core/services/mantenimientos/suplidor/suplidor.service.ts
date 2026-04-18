import { Injectable } from "@angular/core";
import { ModeloSuplidor, ModeloSuplidorData } from ".";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";
import { SupabaseService } from "../../supabase/supabase.service";

@Injectable({
  providedIn: "root"
})
export class ServicioSuplidor {
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

  private toBool(value: any): boolean {
    return value === true || value === 1 || value === "1" || value === "true" || value === "t";
  }

  private mapRow(row: any): ModeloSuplidorData {
    return {
      su_codSupl: Number(row?.su_codsupl ?? row?.su_codSupl ?? 0),
      su_rncSupl: String(row?.su_rncsupl ?? row?.su_rncSupl ?? ""),
      su_nomSupl: String(row?.su_nomsupl ?? row?.su_nomSupl ?? ""),
      su_dirSupl: String(row?.su_dirsupl ?? row?.su_dirSupl ?? ""),
      su_telSupl: String(row?.su_telsupl ?? row?.su_telSupl ?? ""),
      su_contact: String(row?.su_contact ?? ""),
      su_status: this.toBool(row?.su_status ?? row?.status),
    };
  }

  private mapPayload(suplidor: any): any {
    const payload: any = {
      su_rncsupl: suplidor?.su_rncSupl !== undefined && suplidor?.su_rncSupl !== null ? String(suplidor.su_rncSupl).trim() : (suplidor?.su_rncsupl !== undefined && suplidor?.su_rncsupl !== null ? String(suplidor.su_rncsupl).trim() : undefined),
      su_nomsupl: suplidor?.su_nomSupl !== undefined ? String(suplidor.su_nomSupl).trim() : (suplidor?.su_nomsupl !== undefined ? String(suplidor.su_nomsupl).trim() : undefined),
      su_dirsupl: suplidor?.su_dirSupl !== undefined ? String(suplidor.su_dirSupl).trim() : (suplidor?.su_dirsupl !== undefined ? String(suplidor.su_dirsupl).trim() : undefined),
      su_telsupl: suplidor?.su_telSupl !== undefined ? String(suplidor.su_telSupl).trim() : (suplidor?.su_telsupl !== undefined ? String(suplidor.su_telsupl).trim() : undefined),
      su_contact: suplidor?.su_contact !== undefined ? String(suplidor.su_contact).trim() : undefined,
      su_status: suplidor?.su_status !== undefined ? this.toBool(suplidor.su_status) : undefined,
    };
    if (suplidor?.su_codSupl !== undefined && suplidor?.su_codSupl !== null && suplidor?.su_codSupl !== "") {
      payload.su_codsupl = Number(suplidor.su_codSupl);
    }
    Object.keys(payload).forEach((key: string) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });
    return payload;
  }

  buscarTodosSuplidor(pageIndex: number, pageSize: number, codigo?: string, descripcion?: string): Observable<any> {
    const offset = Math.max(pageIndex - 1, 0) * pageSize;
    return from((async () => {
      let query = this.db
        .from("suplidor")
        .select("*", { count: "exact" })
        .order("su_codsupl", { ascending: true })
        .range(offset, offset + pageSize - 1);

      const codigoBusca = String(codigo ?? "").trim();
      const descripcionBusca = String(descripcion ?? "").trim();

      if (codigoBusca) {
        if (/^\d+$/.test(codigoBusca)) {
          query = query.eq("su_codsupl", Number(codigoBusca));
        } else {
          query = query.ilike("su_nomsupl", `%${codigoBusca}%`);
        }
      }
      if (descripcionBusca) {
        query = query.ilike("su_nomsupl", `%${descripcionBusca}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return {
        rows: (data || []).map((row: any) => this.mapRow(row)),
        total: Number(count ?? 0)
      };
    })()).pipe(
      map((result: { rows: ModeloSuplidorData[]; total: number }) => ({
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

  guardarSuplidor(suplidor:ModeloSuplidorData): Observable<any>{
    const payload = this.mapPayload(suplidor);
    return from((async () => {
      const { data, error } = await this.db
        .from("suplidor")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return this.mapRow(data);
    })()).pipe(
      map((row: ModeloSuplidorData) => ({
        status: "success",
        code: 200,
        data: row
      }))
    );
  }

  editarSuplidor(su_codSupl:number,suplidor:ModeloSuplidor): Observable<any>{
    const payload = this.mapPayload(suplidor);
    delete payload.su_codsupl;
    return from((async () => {
      const { data, error } = await this.db
        .from("suplidor")
        .update(payload)
        .eq("su_codsupl", Number(su_codSupl))
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data ? this.mapRow(data) : null;
    })()).pipe(
      map((row: ModeloSuplidorData | null) => ({
        status: "success",
        code: 200,
        data: row
      }))
    );
  }

  eliminarSuplidor(su_codSupl:number): Observable<any>{
    return from((async () => {
      const { error } = await this.db
        .from("suplidor")
        .delete()
        .eq("su_codsupl", Number(su_codSupl));
      if (error) throw error;
      return true;
    })()).pipe(
      map(() => ({ status: "success", code: 200 }))
    );
  }

  buscarSuplidor(su_codSupl:number): Observable<any>{
    return from((async () => {
      const { data, error } = await this.db
        .from("suplidor")
        .select("*")
        .eq("su_codsupl", Number(su_codSupl))
        .maybeSingle();
      if (error) throw error;
      return data ? this.mapRow(data) : null;
    })()).pipe(
      map((row: ModeloSuplidorData | null) => ({
        status: "success",
        code: 200,
        data: row
      }))
    );
  }

  buscartodoSuplidor(): Observable<ModeloSuplidor>{
    return from((async () => {
      const { data, error } = await this.db
        .from("suplidor")
        .select("*")
        .order("su_codsupl", { ascending: true });
      if (error) throw error;
      return (data || []).map((row: any) => this.mapRow(row));
    })()).pipe(
      map((rows: ModeloSuplidorData[]) => ({
        status: "success",
        code: 200,
        message: "",
        data: rows
      }))
    );
  }

  buscarporNombre(nombre:string): Observable<ModeloSuplidor>{
    const termino = String(nombre ?? "").trim();
    return from((async () => {
      const { data, error } = await this.db
        .from("suplidor")
        .select("*")
        .ilike("su_nomsupl", `%${termino}%`)
        .order("su_nomsupl", { ascending: true });
      if (error) throw error;
      return (data || []).map((row: any) => this.mapRow(row));
    })()).pipe(
      map((rows: ModeloSuplidorData[]) => ({
        status: "success",
        code: 200,
        message: "",
        data: rows
      }))
    );
  }
}
