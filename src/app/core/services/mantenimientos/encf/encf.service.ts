import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";
import { SupabaseService } from "../../supabase/supabase.service";

@Injectable({
  providedIn: "root",
})
export class ServicioEncf {
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
    if (!row) return row;
    return {
      id: Number(row?.id ?? 0),
      cantencf: this.toNumberOrNull(row?.cantencf),
      countencf: this.toNumberOrNull(row?.countencf),
      alertaencf: this.toNumberOrNull(row?.alertaencf),
      codempr: row?.codempr ?? "",
      desdeencf: this.toNumberOrNull(row?.desdeencf),
      fechaencf: row?.fechaencf ?? null,
      hastaencf: this.toNumberOrNull(row?.hastaencf),
      tipoencf: row?.tipoencf ?? "",
      tipo: this.toNumberOrNull(row?.tipo),
      empresacodempr: row?.empresacodempr ?? undefined,
    };
  }

  private mapPayload(data: any): any {
    const payload: any = {
      cantencf: this.toNumberOrNull(data?.cantencf),
      countencf: this.toNumberOrNull(data?.countencf),
      alertaencf: this.toNumberOrNull(data?.alertaencf),
      codempr: data?.codempr ? String(data.codempr).trim().toUpperCase() : undefined,
      desdeencf: this.toNumberOrNull(data?.desdeencf),
      fechaencf: data?.fechaencf || undefined,
      hastaencf: this.toNumberOrNull(data?.hastaencf),
      tipoencf: data?.tipoencf ? String(data.tipoencf).trim().toUpperCase() : undefined,
      tipo: this.toNumberOrNull(data?.tipo),
    };

    Object.keys(payload).forEach((key: string) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    return payload;
  }

  listarEncf(
    page: number = 1,
    limit: number = 10,
    codigo?: string,
    descripcion?: string,
    tipo?: string
  ): Observable<any> {
    const currentPage = Math.max(Number(page || 1), 1);
    const pageSize = Math.max(Number(limit || 10), 1);
    const offset = (currentPage - 1) * pageSize;

    return from(
      (async () => {
        let query = this.db
          .from("encf")
          .select("*, empresacodempr:empresas!encf_codempr_fkey(cod_empre, nom_empre)", { count: "exact" })
          .order("id", { ascending: false })
          .range(offset, offset + pageSize - 1);

        const cod = String(codigo || "").trim();
        if (cod) {
          query = query.ilike("codempr", `%${cod}%`);
        }

        const desc = String(descripcion || "").trim();
        if (desc) {
          query = query.or(`codempr.ilike.%${desc}%,tipoencf.ilike.%${desc}%`);
        }

        const tipoEncf = String(tipo || "").trim();
        if (tipoEncf) {
          query = query.eq("tipoencf", tipoEncf.toUpperCase());
        }

        const { data, error, count } = await query;
        if (error) throw error;

        const rows = (data || []).map((row: any) => this.normalizar(row));

        return {
          rows,
          total: Number(count ?? 0),
          page: currentPage,
          limit: pageSize,
        };
      })()
    ).pipe(
      map((result: any) => ({
        status: "success",
        code: 200,
        message: "ENCF obtenido",
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

  crearEncf(data: any): Observable<any> {
    const payload = this.mapPayload(data);

    return from(
      (async () => {
        const { data: created, error } = await this.db
          .from("encf")
          .insert(payload)
          .select("*")
          .single();
        if (error) throw error;
        return this.normalizar(created);
      })()
    ).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        message: "ENCF creado",
        data: row,
      }))
    );
  }

  editarEncf(id: number, data: any): Observable<any> {
    const payload = this.mapPayload(data);

    return from(
      (async () => {
        const { data: updated, error } = await this.db
          .from("encf")
          .update(payload)
          .eq("id", Number(id))
          .select("*")
          .maybeSingle();

        if (error) throw error;
        return updated ? this.normalizar(updated) : null;
      })()
    ).pipe(
      map((row: any | null) => ({
        status: "success",
        code: 200,
        message: "ENCF actualizado",
        data: row,
      }))
    );
  }

  eliminarEncf(id: number): Observable<any> {
    return from(
      (async () => {
        const { error } = await this.db
          .from("encf")
          .delete()
          .eq("id", Number(id));
        if (error) throw error;
        return true;
      })()
    ).pipe(
      map(() => ({
        status: "success",
        code: 200,
        message: "ENCF eliminado",
      }))
    );
  }

  obtenerEncfPorEmpresaId(codempr: string): Observable<any> {
    const cod = String(codempr || "").trim().toUpperCase();

    return from(
      (async () => {
        if (!cod) return [];

        const { data, error } = await this.db
          .from("encf")
          .select("*")
          .eq("codempr", cod)
          .order("id", { ascending: false });

        if (error) throw error;

        return (data || []).map((row: any) => this.normalizar(row));
      })()
    ).pipe(
      map((rows: any[]) => ({
        status: "success",
        code: 200,
        message: "ENCF por empresa",
        data: rows,
      }))
    );
  }

  obtenerEncfPorTipo(tipoencf: string): Observable<any> {
    const tipo = String(tipoencf || "").trim().toUpperCase();

    return from(
      (async () => {
        if (!tipo) return [];

        const { data, error } = await this.db
          .from("encf")
          .select("*")
          .eq("tipoencf", tipo)
          .order("id", { ascending: false });

        if (error) throw error;

        return (data || []).map((row: any) => this.normalizar(row));
      })()
    ).pipe(
      map((rows: any[]) => ({
        status: "success",
        code: 200,
        message: "ENCF por tipo",
        data: rows,
      }))
    );
  }
}
