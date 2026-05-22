import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from '../../supabase/supabase.service';

export interface TiponcfData {
  idNcf: number;
  desNcf: string;
  tipo: string;
  codigo: number;
  grupo: number | null;
}

@Injectable({ providedIn: 'root' })
export class ServicioTiponcf {
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

  private mapRow(row: any): TiponcfData {
    return {
      idNcf: Number(row?.idncf ?? row?.idNcf ?? 0),
      desNcf: String(row?.desncf ?? row?.desNcf ?? "").trim(),
      tipo: String(row?.tipo ?? "").trim(),
      codigo: Number(row?.codigo ?? 0),
      grupo: row?.grupo === null || row?.grupo === undefined || row?.grupo === ""
        ? null
        : Number(row.grupo)
    };
  }

  obtenerTodos(): Observable<any> {
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
        data: rows.map((row: any) => this.mapRow(row))
      }))
    );
  }

  obtenerPorTipo(tipo: string): Observable<any> {
    const value = String(tipo || "").trim();
    return from((async () => {
      const { data, error } = await this.db
        .from("tiponcf")
        .select("*")
        .eq("tipo", value)
        .order("idncf", { ascending: true });
      if (error) throw error;
      return data || [];
    })()).pipe(
      map((rows: any[]) => ({
        status: "success",
        code: 200,
        message: "Tipos NCF cargados",
        data: rows.map((row: any) => this.mapRow(row))
      }))
    );
  }
}
