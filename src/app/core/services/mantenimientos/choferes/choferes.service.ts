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
  obtenerChoferes(): Observable<ModeloChofer>{
    return this.http.GetRequest<ModeloChofer>("/chofer");
  }
  eliminarChoferes(codChofer:number): Observable<ModeloChofer>{
    return this.http.DeleteRequest(`/chofer/${codChofer}`,'');
  }
}
