import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";

export interface TiponcfData {
  idNcf: number;
  desNcf: string;
  tipo: string;
}

@Injectable({ providedIn: "root" })
export class ServicioTiponcf {
  constructor(private http: HttpInvokeService) {}

  obtenerTodos(): Observable<TiponcfData[]> {
    // Algunos backends exponen este recurso como "/tiposncf" (plural)
    return this.http.GetRequest<TiponcfData[]>("/tiposncf");
  }

  obtenerPorTipo(tipo: string): Observable<TiponcfData[]> {
    return this.http.GetRequest<TiponcfData[]>(`/tiposncf/${tipo}`);
  }
}