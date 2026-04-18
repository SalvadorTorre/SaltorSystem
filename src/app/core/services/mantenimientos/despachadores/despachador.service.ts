import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";
import { SupabaseService } from "../../supabase/supabase.service";
import { ModeloDespachador, ModeloDespachadorData } from ".";
@Injectable({
  providedIn: "root"
})
export class ServicioDespachador {
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

  private toBool(value: any): boolean {
    return value === true || value === 1 || value === "1" || value === "true" || value === "t";
  }

  private mapRow(row: any): ModeloDespachadorData {
    return {
      CodDesp: Number(row?.coddesp ?? row?.CodDesp ?? row?.codDesp ?? 0),
      nomDesp: String(row?.nomdesp ?? row?.nomDesp ?? ""),
      tipoDesp: String(row?.tipodesp ?? row?.tipoDesp ?? ""),
      statusDespachadores: this.toBool(row?.statusdespachadores ?? row?.statusDespachadores),
      cedDesp: String(row?.ceddesp ?? row?.cedDesp ?? ""),
    };
  }

  private mapPayload(despachador: any): any {
    const payload: any = {
      nomdesp: despachador?.nomDesp !== undefined ? String(despachador.nomDesp).trim() : (despachador?.nomdesp !== undefined ? String(despachador.nomdesp).trim() : undefined),
      tipodesp: despachador?.tipoDesp !== undefined ? String(despachador.tipoDesp).trim() : (despachador?.tipodesp !== undefined ? String(despachador.tipodesp).trim() : undefined),
      statusdespachadores: despachador?.statusDespachadores !== undefined ? this.toBool(despachador.statusDespachadores) : (despachador?.statusdespachadores !== undefined ? this.toBool(despachador.statusdespachadores) : undefined),
      ceddesp: despachador?.cedDesp !== undefined ? String(despachador.cedDesp).trim() : (despachador?.ceddesp !== undefined ? String(despachador.ceddesp).trim() : undefined),
    };
    if (despachador?.CodDesp !== undefined && despachador?.CodDesp !== null && despachador?.CodDesp !== "") {
      payload.coddesp = Number(despachador.CodDesp);
    }
    if (despachador?.codDesp !== undefined && despachador?.codDesp !== null && despachador?.codDesp !== "") {
      payload.coddesp = Number(despachador.codDesp);
    }
    Object.keys(payload).forEach((key: string) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });
    return payload;
  }

  getByCodigo(codigo: string): Observable<any> {
    const termino = String(codigo ?? "").trim();
    return from((async () => {
      const { data, error } = await this.db
        .from("despachadores")
        .select("*")
        .eq("coddesp", Number(termino))
        .maybeSingle();
      if (error) throw error;
      return data ? this.mapRow(data) : null;
    })()).pipe(
      map((row: ModeloDespachadorData | null) => ({ status: "success", code: 200, data: row }))
    );
  }

  guardarDespachador(despachador: any): Observable<any> {
    const payload = this.mapPayload(despachador);
    return from((async () => {
      const { data, error } = await this.db
        .from("despachadores")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return this.mapRow(data);
    })()).pipe(
      map((row: ModeloDespachadorData) => ({ status: "success", code: 200, data: row }))
    );
  }

  editarDespachador(codDespachador: number, despachador: ModeloDespachadorData): Observable<any> {
    const payload = this.mapPayload(despachador);
    delete payload.coddesp;
    return from((async () => {
      const { data, error } = await this.db
        .from("despachadores")
        .update(payload)
        .eq("coddesp", Number(codDespachador))
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data ? this.mapRow(data) : null;
    })()).pipe(
      map((row: ModeloDespachadorData | null) => ({ status: "success", code: 200, data: row }))
    );
  }
  obtenerDespachadores(): Observable<ModeloDespachador> {
    return from((async () => {
      const { data, error } = await this.db
        .from("despachadores")
        .select("*")
        .order("coddesp", { ascending: true });
      if (error) throw error;
      return (data || []).map((row: any) => this.mapRow(row));
    })()).pipe(
      map((rows: ModeloDespachadorData[]) => ({
        status: "success",
        code: 200,
        message: "",
        data: rows
      }))
    );
  }
  eliminarDespachador(codDespachador: number): Observable<ModeloDespachador> {
    return from((async () => {
      const { error } = await this.db
        .from("despachadores")
        .delete()
        .eq("coddesp", Number(codDespachador));
      if (error) throw error;
      return true;
    })()).pipe(
      map(() => ({ status: "success", code: 200, message: "", data: [] }))
    ) as Observable<ModeloDespachador>;
  }
}
