import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";
import { SupabaseService } from "../../supabase/supabase.service";

export interface Tipousuario {
  id: number;
  descripcion?: string;
  dtipousuarios?: any[];
}

@Injectable({
  providedIn: "root"
})
export class ServicioTipousuario {
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

  private normalizarTipo(tipo: any): Tipousuario {
    return {
      id: Number(tipo?.id ?? 0),
      descripcion: tipo?.descripcion ?? "",
      dtipousuarios: Array.isArray(tipo?.dtipousuarios)
        ? tipo.dtipousuarios
        : []
    };
  }

  obtenerTodosTipousuario(): Observable<any> {
    return from((async () => {
      const { data, error } = await this.db
        .from("tipousuario")
        .select("*")
        .order("id", { ascending: true });
      if (error) throw error;
      return data || [];
    })()).pipe(
      map((rows: any[]) => ({
        status: "success",
        code: 200,
        data: rows.map((row: any) => this.normalizarTipo(row))
      }))
    );
  }

  guardarTipousuario(tipo: Partial<Tipousuario>): Observable<any> {
    return from((async () => {
      const payload = { descripcion: tipo?.descripcion ?? "" };
      const { data, error } = await this.db
        .from("tipousuario")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return this.normalizarTipo(data);
    })()).pipe(
      map((row: Tipousuario) => ({
        status: "success",
        code: 200,
        message: "Tipo creado",
        data: row
      }))
    );
  }

  editarTipousuario(id: number, tipo: Partial<Tipousuario>): Observable<any> {
    return from((async () => {
      const payload = { descripcion: tipo?.descripcion ?? "" };
      const { data, error } = await this.db
        .from("tipousuario")
        .update(payload)
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data ? this.normalizarTipo(data) : null;
    })()).pipe(
      map((row: Tipousuario | null) => ({
        status: "success",
        code: 200,
        message: "Tipo actualizado",
        data: row
      }))
    );
  }

  eliminarTipousuario(id: number): Observable<any> {
    return from((async () => {
      const { error } = await this.db
        .from("tipousuario")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return true;
    })()).pipe(
      map(() => ({
        status: "success",
        code: 200,
        message: "Tipo eliminado"
      }))
    );
  }

  buscarTipousuario(id: number): Observable<any> {
    return from((async () => {
      const [{ data: tipo, error: errTipo }, { data: dets, error: errDets }] =
        await Promise.all([
          this.db.from("tipousuario").select("*").eq("id", id).maybeSingle(),
          this.db
            .from("dtipousuario")
            .select("*")
            .eq("idtipousuario", id)
            .order("id", { ascending: true })
        ]);

      if (errTipo) throw errTipo;
      if (errDets) throw errDets;

      if (!tipo) return null;
      return this.normalizarTipo({
        ...tipo,
        dtipousuarios: dets || []
      });
    })()).pipe(
      map((row: Tipousuario | null) => ({
        status: "success",
        code: 200,
        data: row
      }))
    );
  }

  agregarDetalle(idtipousuario: number, detalle: any): Observable<any> {
    const payload = {
      idtipousuario,
      idmodulo: Number(detalle?.idmodulo),
      acceso: String(detalle?.acceso ?? "N").toUpperCase(),
      lectura: String(detalle?.lectura ?? "N").toUpperCase()
    };

    return from((async () => {
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
        message: "Detalle agregado",
        data: row
      }))
    );
  }

  editarDetalle(idDetalle: number, detalle: any): Observable<any> {
    const payload = {
      idtipousuario: detalle?.idtipousuario ?? undefined,
      idmodulo: detalle?.idmodulo ?? undefined,
      acceso: detalle?.acceso ? String(detalle.acceso).toUpperCase() : undefined,
      lectura: detalle?.lectura ? String(detalle.lectura).toUpperCase() : undefined
    };

    Object.keys(payload).forEach((key: string) => {
      if ((payload as any)[key] === undefined) {
        delete (payload as any)[key];
      }
    });

    return from((async () => {
      const { data, error } = await this.db
        .from("dtipousuario")
        .update(payload)
        .eq("id", idDetalle)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    })()).pipe(
      map((row: any) => ({
        status: "success",
        code: 200,
        message: "Detalle actualizado",
        data: row
      }))
    );
  }

  eliminarDetalle(idDetalle: number): Observable<any> {
    return from((async () => {
      const { error } = await this.db
        .from("dtipousuario")
        .delete()
        .eq("id", idDetalle);
      if (error) throw error;
      return true;
    })()).pipe(
      map(() => ({
        status: "success",
        code: 200,
        message: "Detalle eliminado"
      }))
    );
  }
}
