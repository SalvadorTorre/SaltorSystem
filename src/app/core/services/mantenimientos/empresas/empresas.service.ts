import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";
import { EmpresaModel } from ".";
import { SupabaseService } from "../../supabase/supabase.service";

@Injectable({
  providedIn: "root"
})
export class ServicioEmpresa {
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

  private mapEmpresaPayload(empresas: any): any {
    return {
      cod_empre: empresas?.cod_empre ?? undefined,
      nom_empre: empresas?.nom_empre ?? undefined,
      dir_empre: empresas?.dir_empre ?? undefined,
      tel_empre: empresas?.tel_empre ?? undefined,
      rnc_empre: empresas?.rnc_empre ?? undefined,
      letra_empre: empresas?.letra_empre ?? undefined
    };
  }

  guardarEmpresa(empresas: any): Observable<any> {
    const payload = this.mapEmpresaPayload(empresas);
    return from((async () => {
      const { data, error } = await this.db
        .from("empresas")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({ status: "success", code: 200, data: row }))
    );
  }

  editarEmpresa(cod_empre: string, empresas: EmpresaModel): Observable<any> {
    const payload = this.mapEmpresaPayload(empresas);
    delete payload.cod_empre;
    Object.keys(payload).forEach((key: string) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    return from((async () => {
      const { data, error } = await this.db
        .from("empresas")
        .update(payload)
        .eq("cod_empre", cod_empre)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({ status: "success", code: 200, data: row }))
    );
  }

  buscarTodasEmpresa(pageIndex: number, pageSize: number, descripcion?: string): Observable<any> {
    const offset = Math.max(pageIndex - 1, 0) * pageSize;
    return from((async () => {
      let query = this.db
        .from("empresas")
        .select("*", { count: "exact" })
        .order("cod_empre", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (descripcion) {
        query = query.ilike("nom_empre", `%${descripcion}%`);
      }
      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data || [], total: Number(count ?? 0) };
    })()).pipe(
      map((result: { rows: any[]; total: number }) => ({
        status: "success",
        code: 200,
        data: result.rows,
        pagination: {
          total: result.total,
          page: pageIndex,
          pageSize
        }
      }))
    );
  }

  eliminarEmpresa(cod_empre: string): Observable<any> {
    return from((async () => {
      const { error } = await this.db
        .from("empresas")
        .delete()
        .eq("cod_empre", cod_empre);
      if (error) throw error;
      return true;
    })()).pipe(
      map(() => ({ status: "success", code: 200 }))
    );
  }

  buscarEmpres(cod_empre: string): Observable<any> {
    return from((async () => {
      const codigo = String(cod_empre || "").trim().toUpperCase();
      const [{ data: empresa, error: empresaError }, { data: sucursales, error: sucursalesError }] = await Promise.all([
        this.db
          .from("empresas")
          .select("*")
          .eq("cod_empre", codigo)
          .maybeSingle(),
        this.db
          .from("sucursales")
          .select("*")
          .eq("cod_empre", codigo)
          .order("cod_sucursal", { ascending: true })
      ]);

      if (empresaError) throw empresaError;
      if (sucursalesError) throw sucursalesError;
      if (!empresa) return null;

      return {
        ...empresa,
        sucursales: sucursales || []
      };
    })()).pipe(
      map((row: any) => ({ status: "success", code: 200, data: row }))
    );
  }

  buscarEmpresa(pageIndex: number, pageSize: number, codigo?: string, nomempresa?: string): Observable<any> {
    const offset = Math.max(pageIndex - 1, 0) * pageSize;
    return from((async () => {
      let query = this.db
        .from("empresas")
        .select("*", { count: "exact" })
        .order("cod_empre", { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (codigo) {
        const codigoBusca = String(codigo || "").trim();
        query = query.or(`cod_empre.ilike.%${codigoBusca}%,rnc_empre.ilike.%${codigoBusca}%`);
      }
      if (nomempresa) {
        query = query.ilike("nom_empre", `%${nomempresa}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data || [], total: Number(count ?? 0) };
    })()).pipe(
      map((result: { rows: any[]; total: number }) => ({
        status: "success",
        code: 200,
        data: result.rows,
        pagination: {
          total: result.total,
          page: pageIndex,
          pageSize
        }
      }))
    );
  }
}
