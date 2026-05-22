import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";
import { SupabaseService } from "../../supabase/supabase.service";
import { Modulo } from "src/app/features/private/pages/mantenimientos/pages/configuracion/modulo/modelo";

@Injectable({
  providedIn: "root"
})
export class ServicioModulo {
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

  private normalizarModulo(row: any): Modulo {
    return {
      idmodulo: Number(row?.idmodulo ?? 0),
      descmodulo: row?.descmodulo ?? "",
      scceso: row?.scceso ?? "N",
      lectura: row?.lectura ?? "N",
      permisos: Array.isArray(row?.permisos) ? row.permisos : []
    };
  }

  guardarModulo(modulo: Partial<Modulo>): Observable<any> {
    const payload = {
      descmodulo: modulo?.descmodulo ?? "",
      scceso: (modulo?.scceso ?? "N").toUpperCase(),
      lectura: (modulo?.lectura ?? "N").toUpperCase()
    };

    return from((async () => {
      const { data, error } = await this.db
        .from("modulo")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        message: "Modulo creado",
        data: this.normalizarModulo(row)
      }))
    );
  }

  editarModulo(idmodulo: number, modulo: Partial<Modulo>): Observable<any> {
    const payload: any = {
      descmodulo: modulo?.descmodulo ?? undefined,
      scceso: modulo?.scceso ? String(modulo.scceso).toUpperCase() : undefined,
      lectura: modulo?.lectura ? String(modulo.lectura).toUpperCase() : undefined
    };

    Object.keys(payload).forEach((key: string) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    return from((async () => {
      const { data, error } = await this.db
        .from("modulo")
        .update(payload)
        .eq("idmodulo", idmodulo)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        message: "Modulo actualizado",
        data: row ? this.normalizarModulo(row) : null
      }))
    );
  }

  eliminarModulo(idmodulo: number): Observable<any> {
    return from((async () => {
      const { error } = await this.db
        .from("modulo")
        .delete()
        .eq("idmodulo", idmodulo);
      if (error) throw error;
      return true;
    })()).pipe(
      map(() => ({
        status: "success",
        code: 200,
        message: "Modulo eliminado"
      }))
    );
  }

  buscarModulo(idmodulo: number): Observable<any> {
    return from((async () => {
      const { data, error } = await this.db
        .from("modulo")
        .select("*")
        .eq("idmodulo", idmodulo)
        .maybeSingle();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        data: row ? this.normalizarModulo(row) : null
      }))
    );
  }

  buscarTodosModulo(pageIndex: number, pageSize: number, codigo?: string, descripcion?: string): Observable<any> {
    const offset = Math.max(pageIndex - 1, 0) * pageSize;
    return from((async () => {
      let query = this.db
        .from("modulo")
        .select("*")
        .order("idmodulo", { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (codigo) {
        const cod = Number(codigo);
        if (!Number.isNaN(cod)) {
          query = query.eq("idmodulo", cod);
        }
      }
      if (descripcion) {
        query = query.ilike("descmodulo", `%${descripcion}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    })()).pipe(
      map((rows: any[]) => ({
        status: "success",
        code: 200,
        data: rows.map((row: any) => this.normalizarModulo(row))
      }))
    );
  }

  obtenerTodosModulo(): Observable<any> {
    return from((async () => {
      const { data, error } = await this.db
        .from("modulo")
        .select("*")
        .order("idmodulo", { ascending: true });
      if (error) throw error;
      return data || [];
    })()).pipe(
      map((rows: any[]) => ({
        status: "success",
        code: 200,
        data: rows.map((row: any) => this.normalizarModulo(row))
      }))
    );
  }
}
