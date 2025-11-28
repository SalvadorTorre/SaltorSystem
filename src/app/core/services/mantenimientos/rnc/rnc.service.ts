import { Injectable } from "@angular/core";
import { ModeloRnc, ModeloRncData } from ".";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";

@Injectable({
  providedIn: "root"
})
export class ServicioRnc {
  constructor(private http: HttpInvokeService) { }

  buscarTodosRnc(pageIndex: number, pageSize: number, codigo?: string, descripcion?: string): Observable<any> {
    let url = `/usuario?page=${pageIndex}&limit=${pageSize}`;
    if (codigo) {
      url += `&codigo=${codigo}`;
    }
    if (descripcion) {
      url += `&descripcion=${descripcion}`;
    }
    console.log(url);
    return this.http.GetRequest<any>(url);
  }

  guardaRnc(usuario: ModeloRncData): Observable<any> {
    return this.http.PostRequest<any, any>("/rnc", usuario);
  }

  editarRnc(rnc: number, Rnc: ModeloRnc): Observable<any> {
    return this.http.PutRequest<any, any>(`/Rnc/${rnc}`, Rnc);
  }

  eliminarRnc(rnc: number): Observable<any> {
    return this.http.DeleteRequest(`/rnc/${rnc}`, "");
  }

  buscarrnc(rnc: number): Observable<any> {
    return this.http.GetRequest<any>(`/rnc/${rnc}`);
  }

  buscartodoRnc(rnc: number): Observable<ModeloRnc> {
    return this.http.GetRequest<ModeloRnc>("/rnc/${rnc}");
  }

  buscarRncPorId(rnc: string): Observable<any> {
    return this.http.GetRequest<any>(`/rnc-id/${rnc}`);
  }
    buscarRncPorrncId(rnc: string): Observable<any> {
    return this.http.GetRequest<any>(`/rncid/${rnc}`);
  }
}
