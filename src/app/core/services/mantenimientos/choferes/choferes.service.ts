import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";
import { SupabaseService } from "../../supabase/supabase.service";
import { ModeloChofer, ModeloChoferData } from ".";

@Injectable({
  providedIn: "root"
})
export class ServicioChofer {
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

  private mapRow(row: any): ModeloChoferData {
    return {
      codChofer: Number(row?.codchofer ?? row?.codChofer ?? 0),
      nomChofer: String(row?.nomchofer ?? row?.nomChofer ?? ""),
      cedChofer: String(row?.cedchofer ?? row?.cedChofer ?? ""),
      statusChofer: this.toBool(row?.statuschofer ?? row?.statusChofer),
      claveUsuario: String(row?.claveusuario ?? row?.claveUsuario ?? ""),
    };
  }

  private mapPayload(chofer: any): any {
    const payload: any = {
      nomchofer: chofer?.nomChofer !== undefined ? String(chofer.nomChofer).trim() : (chofer?.nomchofer !== undefined ? String(chofer.nomchofer).trim() : undefined),
      cedchofer: chofer?.cedChofer !== undefined ? String(chofer.cedChofer).trim() : (chofer?.cedchofer !== undefined ? String(chofer.cedchofer).trim() : undefined),
      statuschofer: chofer?.statusChofer !== undefined ? this.toBool(chofer.statusChofer) : (chofer?.statuschofer !== undefined ? this.toBool(chofer.statuschofer) : undefined),
      claveusuario: chofer?.claveUsuario !== undefined ? String(chofer.claveUsuario).trim() : (chofer?.claveusuario !== undefined ? String(chofer.claveusuario).trim() : undefined),
    };
    if (chofer?.codChofer !== undefined && chofer?.codChofer !== null && chofer?.codChofer !== "") {
      payload.codchofer = Number(chofer.codChofer);
    }
    Object.keys(payload).forEach((key: string) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });
    return payload;
  }

  guardarChofer(sector:any): Observable<any>{
    const payload = this.mapPayload(sector);
    return from((async () => {
      const { data, error } = await this.db
        .from("choferes")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return this.mapRow(data);
    })()).pipe(
      map((row: ModeloChoferData) => ({ status: "success", code: 200, data: row }))
    );
  }

  editarChofer(codChofer:number,chofer:ModeloChoferData): Observable<any>{
    const payload = this.mapPayload(chofer);
    delete payload.codchofer;
    return from((async () => {
      const { data, error } = await this.db
        .from("choferes")
        .update(payload)
        .eq("codchofer", Number(codChofer))
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data ? this.mapRow(data) : null;
    })()).pipe(
      map((row: ModeloChoferData | null) => ({ status: "success", code: 200, data: row }))
    );
  }

  buscarTodosChofer(pageIndex: number, pageSize: number,  descripcion?: string): Observable<any> {
    const offset = Math.max(pageIndex - 1, 0) * pageSize;
    return from((async () => {
      let query = this.db
        .from("choferes")
        .select("*", { count: "exact" })
        .order("codchofer", { ascending: true })
        .range(offset, offset + pageSize - 1);

      const termino = String(descripcion ?? "").trim();
      if (termino) {
        query = query.or(`nomchofer.ilike.%${termino}%,cedchofer.ilike.%${termino}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return {
        rows: (data || []).map((row: any) => this.mapRow(row)),
        total: Number(count ?? 0)
      };
    })()).pipe(
      map((result: { rows: ModeloChoferData[]; total: number }) => ({
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

  eliminarChofer(codChofer:number): Observable<any>{
    return from((async () => {
      const { error } = await this.db
        .from("choferes")
        .delete()
        .eq("codchofer", Number(codChofer));
      if (error) throw error;
      return true;
    })()).pipe(
      map(() => ({ status: "success", code: 200 }))
    );
  }

  buscarChofer(codChofer:number): Observable<any>{
    return from((async () => {
      const { data, error } = await this.db
        .from("choferes")
        .select("*")
        .eq("codchofer", Number(codChofer))
        .maybeSingle();
      if (error) throw error;
      return data ? this.mapRow(data) : null;
    })()).pipe(
      map((row: ModeloChoferData | null) => ({ status: "success", code: 200, data: row }))
    );
  }

  buscartodoChofer(): Observable<ModeloChofer>{
    return from((async () => {
      const { data, error } = await this.db
        .from("choferes")
        .select("*")
        .order("codchofer", { ascending: true });
      if (error) throw error;
      return (data || []).map((row: any) => this.mapRow(row));
    })()).pipe(
      map((rows: ModeloChoferData[]) => ({ status: "success", code: 200, message: "", data: rows }))
    );
  }
  obtenerChoferes(): Observable<ModeloChofer>{
    return this.buscartodoChofer();
  }
  eliminarChoferes(codChofer:number): Observable<ModeloChofer>{
    return this.eliminarChofer(codChofer) as Observable<ModeloChofer>;
  }
  buscarchoferporCodigo(codChofer:number): Observable<any> {
    return this.buscarChofer(codChofer);
  }
}
