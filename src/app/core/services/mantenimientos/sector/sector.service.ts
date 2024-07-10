import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { ModeloSector } from ".";

@Injectable({
  providedIn: "root"
})
export class ServicioSector {
  constructor(private http:HttpInvokeService) {}

  guardarZona(sector:any): Observable<any>{
    return this.http.PostRequest<any,any>("/sector",sector);
  }

  editarsector(se_codSect:number,sector:ModeloSector): Observable<any>{
    return this.http.PutRequest<any,any>(`/sector/${se_codSect}`,sector);
  }
  obtenerTodasSector(): Observable<ModeloSector>{
    return this.http.GetRequest<ModeloSector>("/sector");
  }
}
