import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";
import { ModeloFpago, ModeloFpagoData } from ".";
import { SupabaseService } from "../../supabase/supabase.service";

@Injectable({
  providedIn: "root"
})
export class ServicioFpago {
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

  private mapRow(row: any): ModeloFpagoData {
    return {
      fp_codfpago: Number(row?.fp_codfpago ?? 0),
      fp_descfpago: String(row?.fp_descfpago ?? "").trim(),
      dgii_codigo: row?.dgii_codigo !== undefined && row?.dgii_codigo !== null
        ? Number(row.dgii_codigo)
        : undefined,
      es_dgii: row?.es_dgii !== undefined ? !!row.es_dgii : undefined,
      activo: row?.activo !== undefined ? !!row.activo : undefined
    };
  }

  guardarFpago(fpago: any): Observable<any> {
    const payload = {
      fp_descfpago: String(fpago?.fp_descfpago ?? "").trim()
    };

    return from((async () => {
      const { data, error } = await this.db
        .from("fpago")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        message: "Forma de pago guardada",
        data: this.mapRow(row)
      }))
    );
  }

  editarFpago(fp_codfpago: number, fpago: Partial<ModeloFpagoData> | { fp_descfpago: string }): Observable<any> {
    const payload: any = {
      fp_descfpago: String((fpago as any)?.fp_descfpago ?? "").trim() || undefined
    };

    Object.keys(payload).forEach((key: string) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    return from((async () => {
      const { data, error } = await this.db
        .from("fpago")
        .update(payload)
        .eq("fp_codfpago", Number(fp_codfpago))
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        message: "Forma de pago actualizada",
        data: row ? this.mapRow(row) : null
      }))
    );
  }

  eliminarfpago(fp_codfpago: number): Observable<any> {
    return from((async () => {
      const { error } = await this.db
        .from("fpago")
        .delete()
        .eq("fp_codfpago", Number(fp_codfpago));
      if (error) throw error;
      return true;
    })()).pipe(
      map(() => ({ status: "success", code: 200, message: "Forma de pago eliminada" }))
    );
  }

  buscarTodosFpago(pageIndex: number, pageSize: number, descripcion?: string): Observable<any> {
    const offset = Math.max(pageIndex - 1, 0) * pageSize;
    return from((async () => {
      let query = this.db
        .from("fpago")
        .select("*", { count: "exact" })
        .order("fp_codfpago", { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (descripcion) {
        query = query.ilike("fp_descfpago", `%${descripcion}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data || [], total: Number(count ?? 0) };
    })()).pipe(
      map((result: { rows: any[]; total: number }) => ({
        status: "success",
        code: 200,
        message: "Formas de pago cargadas",
        data: result.rows.map((row: any) => this.mapRow(row)),
        pagination: {
          total: result.total,
          page: pageIndex,
          pageSize
        }
      }))
    );
  }

  obtenerTodosFpago(): Observable<any> {
    return from((async () => {
      const { data, error } = await this.db
        .from("fpago")
        .select("*")
        .order("fp_codfpago", { ascending: true });
      if (error) throw error;
      return data || [];
    })()).pipe(
      map((rows: any[]) => ({
        status: "success",
        code: 200,
        message: "Formas de pago cargadas",
        data: rows.map((row: any) => this.mapRow(row))
      }))
    );
  }

  obtenerFpagoPorId(codigo: string): Observable<any> {
    return from((async () => {
      const cod = Number(codigo);
      const { data, error } = await this.db
        .from("fpago")
        .select("*")
        .eq("fp_codfpago", cod)
        .maybeSingle();
      if (error) throw error;
      return data ? this.mapRow(data) : null;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        message: "Forma de pago cargada",
        data: row
      }))
    );
  }
}
