import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";
import { SupabaseService } from "../../supabase/supabase.service";
import { Permiso } from "src/app/features/private/pages/mantenimientos/pages/configuracion/permiso/modelo";

@Injectable({
  providedIn: "root"
})
export class ServicioPermiso {
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

  private normalizarPermiso(row: any): any {
    const codusuario = Number(row?.codusuario ?? row?.idusuario ?? 0) || null;
    return {
      ...row,
      idpermiso: row?.idpermiso ?? null,
      codusuario,
      idusuario: codusuario,
      idmodulo: row?.idmodulo ?? null,
      acceso: row?.acceso ?? "N",
      lectura: row?.lectura ?? "N"
    };
  }

  obtenerTodosPermiso(): Observable<any> {
    return from((async () => {
      const { data, error } = await this.db
        .from("permiso")
        .select("*")
        .order("idpermiso", { ascending: true });
      if (error) throw error;
      return data || [];
    })()).pipe(
      map((rows: any[]) => ({
        status: "success",
        code: 200,
        data: rows.map((row: any) => this.normalizarPermiso(row))
      }))
    );
  }

  guardarPermiso(permiso: Partial<Permiso>): Observable<any> {
    const codusuario = Number((permiso as any)?.codusuario ?? (permiso as any)?.idusuario);
    const payload = {
      codusuario: Number.isNaN(codusuario) ? null : codusuario,
      idmodulo: permiso?.idmodulo ?? null,
      acceso: String(permiso?.acceso ?? "N").toUpperCase(),
      lectura: String(permiso?.lectura ?? "N").toUpperCase()
    };

    return from((async () => {
      const { data, error } = await this.db
        .from("permiso")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        data: this.normalizarPermiso(row)
      }))
    );
  }

  editarPermiso(idpermiso: number, permiso: Partial<Permiso>): Observable<any> {
    const codusuario = Number((permiso as any)?.codusuario ?? (permiso as any)?.idusuario);
    const payload: any = {
      codusuario: Number.isNaN(codusuario) ? undefined : codusuario,
      idmodulo: permiso?.idmodulo ?? undefined,
      acceso: permiso?.acceso ? String(permiso.acceso).toUpperCase() : undefined,
      lectura: permiso?.lectura ? String(permiso.lectura).toUpperCase() : undefined
    };

    Object.keys(payload).forEach((key: string) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    return from((async () => {
      const { data, error } = await this.db
        .from("permiso")
        .update(payload)
        .eq("idpermiso", idpermiso)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        data: row ? this.normalizarPermiso(row) : null
      }))
    );
  }

  eliminarPermiso(idpermiso: number): Observable<any> {
    return from((async () => {
      const { error } = await this.db
        .from("permiso")
        .delete()
        .eq("idpermiso", idpermiso);
      if (error) throw error;
      return true;
    })()).pipe(
      map(() => ({
        status: "success",
        code: 200
      }))
    );
  }

  buscarPermiso(idpermiso: number): Observable<any> {
    return from((async () => {
      const { data, error } = await this.db
        .from("permiso")
        .select("*")
        .eq("idpermiso", idpermiso)
        .maybeSingle();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        data: row ? this.normalizarPermiso(row) : null
      }))
    );
  }
}
