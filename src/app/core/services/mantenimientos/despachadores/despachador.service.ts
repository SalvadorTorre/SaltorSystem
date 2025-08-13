import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { ModeloDespachador, ModeloDespachadorData } from ".";
import { Despachadores } from "./despachadores";

@Injectable({
  providedIn: "root"
})
export class ServicioDespachador {
  private baseUrl = 'http://localhost:3000/api';
  constructor(private http: HttpInvokeService) { }

  getByCodigo(codigo: string): Observable<any> {
    return this.http.GetRequest<any>(`/despachadores/${codigo}`);
  }

  guardarDespachador(despachador: any): Observable<any> {
    return this.http.PostRequest<any, any>("/despachadores", despachador);
  }

  editarDespachador(codDespachador: number, despachador: ModeloDespachadorData): Observable<any> {
    return this.http.PutRequest<any, any>(`/despachadores/${codDespachador}`, despachador);
  }
  obtenerDespachadores(): Observable<ModeloDespachador> {
    return this.http.GetRequest<ModeloDespachador>("/despachadores");
  }
  eliminarDespachador(codDespachador: number): Observable<ModeloDespachador> {
    return this.http.DeleteRequest(`/despachadores/${codDespachador}`, '');
  }
}
