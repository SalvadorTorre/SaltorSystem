import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { ModeloSector } from ".";

@Injectable({
  providedIn: "root"
})
export class ServicioSector {
  constructor(private http:HttpInvokeService) {}

  guardarSector(sector:any): Observable<any>{
    return this.http.PostRequest<any,any>("/sector",sector);
  }

  editarSector(se_codSect:number,sector:ModeloSector): Observable<any>{
    return this.http.PutRequest<any,any>(`/zonas/${se_codSect}`,sector);
  }
  obtenerTodasSector(): Observable<ModeloSector>{
    return this.http.GetRequest<ModeloSector>("/sector");
  }
  getAllSector(pageIndex: number, pageSize: number,  codigo?:string, descripcion?: string): Observable<any> {
    let url = `/sector?page=${pageIndex}&limit=${pageSize}`;
    if (codigo) {
      url += `&codigo=${codigo}`;
    }
    if (descripcion) {
      url += `&descripcion=${descripcion}`;
    }
console.log(url);
    return this.http.GetRequest<any>(url);
  }

  buscarTodossector(pageIndex: number, pageSize: number,  codigo?:string, descripcion?: string): Observable<any> {
    let url = `/sector?page=${pageIndex}&limit=${pageSize}`;
    if (codigo) {
      url += `&codigo=${codigo}`;
    }
    if (descripcion) {
      url += `&descripcion=${descripcion}`;
    }
console.log(url);
    return this.http.GetRequest<any>(url);
  }

}
