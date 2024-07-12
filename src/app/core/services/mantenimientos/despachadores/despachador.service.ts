import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { ModeloDespachador, ModeloDespachadorData } from ".";

@Injectable({
  providedIn: "root"
})
export class ServicioDespachador {
  constructor(private http:HttpInvokeService) {}

  guardarDespachador(despachador:any): Observable<any>{
    return this.http.PostRequest<any,any>("/despachadores",despachador);
  }

  editarDespachador(codDespachador:number,despachador:ModeloDespachadorData): Observable<any>{
    return this.http.PutRequest<any,any>(`/despachadores/${codDespachador}`,despachador);
  }
  obtenerDespachadores(): Observable<ModeloDespachador>{
    return this.http.GetRequest<ModeloDespachador>("/despachadores");
  }
  eliminarDespachador(codDespachador:number): Observable<ModeloDespachador>{
    return this.http.DeleteRequest(`/despachadores/${codDespachador}`,'');
  }
}
