import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { ModeloChofer, ModeloChoferData } from ".";

@Injectable({
  providedIn: "root"
})
export class ServicioChofer {
  constructor(private http:HttpInvokeService) {}

  guardarChofer(sector:any): Observable<any>{
    return this.http.PostRequest<any,any>("/chofer",sector);
  }

  editarChofer(codChofer:number,chofer:ModeloChoferData): Observable<any>{
    return this.http.PutRequest<any,any>(`/chofer/${codChofer}`,chofer);
  }

  buscarTodosChofer(pageIndex: number, pageSize: number,  descripcion?: string): Observable<any> {
    let url = `/chofer?page=${pageIndex}&limit=${pageSize}`;
    if (descripcion) {
      url += `&descripcion=${descripcion}`;
    }
console.log(url);
    return this.http.GetRequest<any>(url);
  }

  eliminarChofer(codChofer:number): Observable<any>{
    return this.http.DeleteRequest(`/chofer/${codChofer}`, "");
  }

  buscarChofer(codChofer:number): Observable<any>{
    return this.http.GetRequest<any>(`/chofer/${codChofer}`);
  }

  buscartodoChofer(): Observable<ModeloChofer>{
    return this.http.GetRequest<ModeloChofer>("/chofer");
  }
  obtenerChoferes(): Observable<ModeloChofer>{
    return this.http.GetRequest<ModeloChofer>("/chofer");
  }
  eliminarChoferes(codChofer:number): Observable<ModeloChofer>{
    return this.http.DeleteRequest(`/chofer/${codChofer}`,'');
  }



}









 