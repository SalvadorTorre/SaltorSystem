import { Injectable } from "@angular/core";
import { ModeloSuplidor, ModeloSuplidorData } from ".";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";

@Injectable({
  providedIn: "root"
})
export class ServicioSuplidor {
  constructor(private http:HttpInvokeService) {}

  buscarTodosSuplidor(): Observable<ModeloSuplidor>{
    return this.http.GetRequest<ModeloSuplidor>("/suplidor");
  }
  guardarSuplidor(suplidor:ModeloSuplidorData): Observable<any>{
    return this.http.PostRequest<any,any>("/suplidor",suplidor);
  }

  editarSuplidor(su_codSupl:number,suplidor:ModeloSuplidor): Observable<any>{
    return this.http.PutRequest<any,any>(`/suplidor/${su_codSupl}`,suplidor);
  }

  eliminarSuplidor(su_codSupl:number): Observable<any>{
    return this.http.DeleteRequest(`/suplidor/${su_codSupl}`, "");
  }

  buscarSuplidor(su_codSupl:number): Observable<any>{
    return this.http.GetRequest<any>(`/suplidor/${su_codSupl}`);
  }

  buscartodoSuplidor(): Observable<ModeloSuplidor>{
    return this.http.GetRequest<ModeloSuplidor>("/suplidor");
  }
}
