import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";
import { ModeloFentrega, ModeloFentregaData } from ".";
import { SupabaseService } from "../../supabase/supabase.service";

@Injectable({
  providedIn: "root",
})
export class ServicioFentrega {
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

  private mapRow(row: any): ModeloFentregaData {
    return {
      idfentrega: Number(row?.idfentrega ?? 0),
      desentrega: String(row?.desentrega ?? "").trim()
    };
  }

  guardarFentrega(fentrega: Partial<ModeloFentregaData>): Observable<any> {
    const payload = {
      desentrega: String(fentrega?.desentrega ?? "").trim()
    };

    return from((async () => {
      const { data, error } = await this.db
        .from("fentrega")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        message: "Forma de entrega guardada",
        data: this.mapRow(row)
      }))
    );
  }

  editarFentrega(idfentrega: number, fentrega: Partial<ModeloFentregaData>): Observable<any> {
    const payload: any = {
      desentrega: String(fentrega?.desentrega ?? "").trim() || undefined
    };

    Object.keys(payload).forEach((key: string) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    return from((async () => {
      const { data, error } = await this.db
        .from("fentrega")
        .update(payload)
        .eq("idfentrega", Number(idfentrega))
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        message: "Forma de entrega actualizada",
        data: row ? this.mapRow(row) : null
      }))
    );
  }

  eliminarFentrega(idfentrega: number): Observable<any> {
    return from((async () => {
      const { error } = await this.db
        .from("fentrega")
        .delete()
        .eq("idfentrega", Number(idfentrega));
      if (error) throw error;
      return true;
    })()).pipe(
      map(() => ({ status: "success", code: 200, message: "Forma de entrega eliminada" }))
    );
  }

  buscarTodosFentrega(pageIndex: number, pageSize: number, descripcion?: string): Observable<any> {
    const offset = Math.max(pageIndex - 1, 0) * pageSize;
    return from((async () => {
      let query = this.db
        .from("fentrega")
        .select("*", { count: "exact" })
        .order("idfentrega", { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (descripcion) {
        query = query.ilike("desentrega", `%${descripcion}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data || [], total: Number(count ?? 0) };
    })()).pipe(
      map((result: { rows: any[]; total: number }) => ({
        status: "success",
        code: 200,
        message: "Formas de entrega cargadas",
        data: result.rows.map((row: any) => this.mapRow(row)),
        pagination: {
          total: result.total,
          page: pageIndex,
          pageSize
        }
      }))
    );
  }

  obtenerTodosFentrega(): Observable<ModeloFentrega> {
    return from((async () => {
      const { data, error } = await this.db
        .from("fentrega")
        .select("*")
        .order("idfentrega", { ascending: true });
      if (error) throw error;
      return data || [];
    })()).pipe(
      map((rows: any[]) => ({
        status: "success",
        code: 200,
        message: "Formas de entrega cargadas",
        data: rows.map((row: any) => this.mapRow(row))
      }))
    );
  }

  obtenerFentregaPorId(id: number | string): Observable<ModeloFentrega> {
    return from((async () => {
      const codigo = Number(id);
      const { data, error } = await this.db
        .from("fentrega")
        .select("*")
        .eq("idfentrega", codigo)
        .maybeSingle();
      if (error) throw error;
      return data ? this.mapRow(data) : null;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        message: "Forma de entrega cargada",
        data: row
      }))
    );
  }
}
