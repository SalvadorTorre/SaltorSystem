import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { ModeloZona } from ".";

@Injectable({
  providedIn: "root"
})
export class ServicioZona {
  constructor(private http: HttpInvokeService) { }

  guardarZona(zona: any): Observable<any> {
    return this.http.PostRequest<any, any>("/zonas", zona);
  }

  editarzona(zo_codZona: number, zona: ModeloZona): Observable<any> {
    return this.http.PutRequest<any, any>(`/zonas/${zo_codZona}`, zona);
  }
  obtenerTodasZonas(): Observable<ModeloZona> {
    return this.http.GetRequest<ModeloZona>("/zonas");
  }
  buscarTodasZonas(pageIndex: number, pageSize: number, codigo?: string, descripcion?: string): Observable<any> {
    let url = `/zonas?page=${pageIndex}&limit=${pageSize}`;
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
