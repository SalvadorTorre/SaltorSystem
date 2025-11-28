import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { ModeloGrupoMercancias, ModeloGrupoMercanciasData } from ".";

@Injectable({
  providedIn: "root"
})
export class ServicioGrupoMercancias {
  constructor(private http: HttpInvokeService) { }

  guardarGrupoMercancias(grupomerc: ModeloGrupoMercanciasData): Observable<any> {
    return this.http.PostRequest<any, any>("/grupomerc", grupomerc);
  }

  editarGrupoMercancias(Codgrupo: number, grupomerc: ModeloGrupoMercanciasData): Observable<any> {
    return this.http.PutRequest<any, any>(`/grupomerc/${Codgrupo}`, grupomerc);
  }
  obtenerGrupoMercancias(pageIndex: number, pageSize: number, codigo?: string, descripcion?: string): Observable<any> {
    let url = `/grupomerc?page=${pageIndex}&limit=${pageSize}`;

    if (codigo) {
      url += `&codigo=${codigo}`;
    }
    if (descripcion) {
      url += `&descripcion=${descripcion}`;
    }
    console.log(url);
    return this.http.GetRequest<any>(url);
  }

  obtenerTodosGrupoMercancias(): Observable<any> {
    return this.http.GetRequest<any>("/grupomerc-all");
  }
}
