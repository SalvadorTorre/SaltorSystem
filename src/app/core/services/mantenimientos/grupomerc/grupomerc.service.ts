import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";
import { ModeloGrupoMercanciasData } from ".";
import { SupabaseService } from "../../supabase/supabase.service";

@Injectable({
  providedIn: "root"
})
export class ServicioGrupoMercancias {
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

  private mapRow(row: any): ModeloGrupoMercanciasData {
    return {
      Codgrupo: String(row?.codgrupo ?? "").trim(),
      Descgrupo: String(row?.descgrupo ?? "").trim(),
      Tipomerc: String(row?.tipomerc ?? "").trim()
    };
  }

  private mapPayload(grupomerc: any): any {
    const payload: any = {
      codgrupo: grupomerc?.Codgrupo ?? grupomerc?.codgrupo ?? undefined,
      descgrupo: grupomerc?.Descgrupo ?? grupomerc?.descgrupo ?? undefined,
      tipomerc: grupomerc?.Tipomerc ?? grupomerc?.tipomerc ?? undefined
    };
    Object.keys(payload).forEach((k: string) => {
      if (payload[k] === undefined) {
        delete payload[k];
      }
    });
    return payload;
  }

  guardarGrupoMercancias(grupomerc: ModeloGrupoMercanciasData): Observable<any> {
    const payload = this.mapPayload(grupomerc);
    return from((async () => {
      const { data, error } = await this.db
        .from("grupomerc")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        data: this.mapRow(row)
      }))
    );
  }

  editarGrupoMercancias(Codgrupo: number, grupomerc: ModeloGrupoMercanciasData): Observable<any> {
    const payload = this.mapPayload(grupomerc);
    delete payload.codgrupo;
    const codigo = String((grupomerc as any)?.Codgrupo ?? Codgrupo ?? "").trim();
    return from((async () => {
      const { data, error } = await this.db
        .from("grupomerc")
        .update(payload)
        .eq("codgrupo", codigo)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        data: row ? this.mapRow(row) : null
      }))
    );
  }

  obtenerGrupoMercancias(pageIndex: number, pageSize: number, codigo?: string, descripcion?: string): Observable<any> {
    const offset = Math.max(pageIndex - 1, 0) * pageSize;
    return from((async () => {
      let query = this.db
        .from("grupomerc")
        .select("*", { count: "exact" })
        .order("codgrupo", { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (codigo) {
        query = query.ilike("codgrupo", `%${codigo}%`);
      }
      if (descripcion) {
        query = query.ilike("descgrupo", `%${descripcion}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data || [], total: Number(count ?? 0) };
    })()).pipe(
      map((result: { rows: any[]; total: number }) => ({
        status: "success",
        code: 200,
        data: result.rows.map((row: any) => this.mapRow(row)),
        pagination: {
          total: result.total,
          page: pageIndex,
          pageSize
        }
      }))
    );
  }

  obtenerTodosGrupoMercancias(): Observable<any> {
    return from((async () => {
      const { data, error } = await this.db
        .from("grupomerc")
        .select("*")
        .order("codgrupo", { ascending: true });
      if (error) throw error;
      return data || [];
    })()).pipe(
      map((rows: any[]) => ({
        status: "success",
        code: 200,
        data: rows.map((row: any) => this.mapRow(row))
      }))
    );
  }
}
