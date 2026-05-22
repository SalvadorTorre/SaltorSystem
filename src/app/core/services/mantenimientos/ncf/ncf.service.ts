import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";
import { SupabaseService } from "../../supabase/supabase.service";
import { TiponcfData } from "../tiponcf/tiponcf.service";

@Injectable({
  providedIn: "root"
})
export class ServicioNcf {
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

  buscarTodosNcf(): Observable<any> {
    return from((async () => {
      const { data, error } = await this.db
        .from("tiponcf")
        .select("*")
        .order("idncf", { ascending: true });
      if (error) throw error;
      return data || [];
    })()).pipe(
      map((rows: any[]) => ({
        status: "success",
        code: 200,
        message: "Tipos NCF cargados",
        data: rows.map((row: any) => ({
          idNcf: Number(row?.idncf ?? row?.idNcf ?? 0),
          desNcf: String(row?.desncf ?? row?.desNcf ?? "").trim(),
          tipo: String(row?.tipo ?? "").trim(),
          codigo: Number(row?.codigo ?? 0),
          grupo: row?.grupo === null || row?.grupo === undefined || row?.grupo === ""
            ? null
            : Number(row.grupo)
        }) as TiponcfData)
      }))
    );
  }
}
