import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";
import { SupabaseService } from "../../supabase/supabase.service";

export interface Dtipousuario {
  id: number;
  idtipousuario?: number;
  idmodulo?: number;
  lectura?: string;
  acceso?: string;
}

@Injectable({
  providedIn: "root"
})
export class ServicioDtipousuario {
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

  obtenerTodosDtipousuario(): Observable<any> {
    return from((async () => {
      const { data, error } = await this.db
        .from("dtipousuario")
        .select("*")
        .order("id", { ascending: true });
      if (error) throw error;
      return data || [];
    })()).pipe(
      map((rows: any[]) => ({
        status: "success",
        code: 200,
        data: rows
      }))
    );
  }

  guardarDtipousuario(det: Partial<Dtipousuario>): Observable<any> {
    return from((async () => {
      const payload = {
        idtipousuario: det?.idtipousuario ?? null,
        idmodulo: det?.idmodulo ?? null,
        lectura: det?.lectura ?? "N",
        acceso: det?.acceso ?? "N"
      };
      const { data, error } = await this.db
        .from("dtipousuario")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        data: row
      }))
    );
  }

  editarDtipousuario(id: number, det: Partial<Dtipousuario>): Observable<any> {
    return from((async () => {
      const payload = {
        idtipousuario: det?.idtipousuario ?? undefined,
        idmodulo: det?.idmodulo ?? undefined,
        lectura: det?.lectura ?? undefined,
        acceso: det?.acceso ?? undefined
      };
      Object.keys(payload).forEach((key: string) => {
        if ((payload as any)[key] === undefined) {
          delete (payload as any)[key];
        }
      });

      const { data, error } = await this.db
        .from("dtipousuario")
        .update(payload)
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        data: row
      }))
    );
  }

  eliminarDtipousuario(id: number): Observable<any> {
    return from((async () => {
      const { error } = await this.db
        .from("dtipousuario")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return true;
    })()).pipe(
      map(() => ({
        status: "success",
        code: 200
      }))
    );
  }

  buscarDtipousuario(id: number): Observable<any> {
    return from((async () => {
      const { data, error } = await this.db
        .from("dtipousuario")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        data: row
      }))
    );
  }
}
