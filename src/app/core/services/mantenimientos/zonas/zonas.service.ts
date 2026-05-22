import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";
import { ModeloZona, ModeloZonaData } from ".";
import { SupabaseService } from "../../supabase/supabase.service";

@Injectable({
  providedIn: "root"
})
export class ServicioZona {
  constructor(private supabase: SupabaseService) { }

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

  private mapRow(row: any): ModeloZonaData {
    return {
      zo_codZona: Number(row?.zo_codzona ?? row?.zo_codZona ?? 0),
      zo_descrip: String(row?.zo_descrip ?? "").trim()
    };
  }

  guardarZona(zona: any): Observable<any> {
    const payload = {
      zo_descrip: String(zona?.zo_descrip ?? "").trim()
    };

    return from((async () => {
      const { data, error } = await this.db
        .from("zona")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        message: "Zona guardada",
        data: this.mapRow(row)
      }))
    );
  }

  editarzona(zo_codZona: number, zona: ModeloZona): Observable<any> {
    const payload: any = {
      zo_descrip: String((zona as any)?.zo_descrip ?? "").trim() || undefined
    };

    Object.keys(payload).forEach((key: string) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    return from((async () => {
      const { data, error } = await this.db
        .from("zona")
        .update(payload)
        .eq("zo_codzona", Number(zo_codZona))
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        message: "Zona actualizada",
        data: row ? this.mapRow(row) : null
      }))
    );
  }

  obtenerTodasZonas(): Observable<any> {
    return from((async () => {
      const { data, error } = await this.db
        .from("zona")
        .select("*")
        .order("zo_codzona", { ascending: true });
      if (error) throw error;
      return data || [];
    })()).pipe(
      map((rows: any[]) => ({
        status: "success",
        code: 200,
        message: "Zonas cargadas",
        data: rows.map((row: any) => this.mapRow(row))
      }))
    );
  }

  buscarTodasZonas(pageIndex: number, pageSize: number, codigo?: string, descripcion?: string): Observable<any> {
    const offset = Math.max(pageIndex - 1, 0) * pageSize;
    return from((async () => {
      let query = this.db
        .from("zona")
        .select("*", { count: "exact" })
        .order("zo_codzona", { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (codigo) {
        const cod = Number(codigo);
        if (!Number.isNaN(cod)) {
          query = query.eq("zo_codzona", cod);
        }
      }
      if (descripcion) {
        query = query.ilike("zo_descrip", `%${descripcion}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data || [], total: Number(count ?? 0) };
    })()).pipe(
      map((result: { rows: any[]; total: number }) => ({
        status: "success",
        code: 200,
        message: "Zonas cargadas",
        data: result.rows.map((row: any) => this.mapRow(row)),
        pagination: {
          total: result.total,
          page: pageIndex,
          pageSize
        }
      }))
    );
  }
}
