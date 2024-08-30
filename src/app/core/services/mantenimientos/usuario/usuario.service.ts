import { Injectable } from "@angular/core";
import { ModeloUsuario, ModeloUsuarioData } from ".";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";

@Injectable({
  providedIn: "root"
})
export class ServicioUsuario {
  constructor(private http: HttpInvokeService) { }

  buscarTodosUsuario(pageIndex: number, pageSize: number, codigo?: string, descripcion?: string): Observable<any> {
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

  guardarUsuario(usuario: ModeloUsuarioData): Observable<any> {
    return this.http.PostRequest<any, any>("/usuario", usuario);
  }

  editarUsuario(su_codSupl: number, usuario: ModeloUsuario): Observable<any> {
    return this.http.PutRequest<any, any>(`/usuario/${su_codSupl}`, usuario);
  }

  eliminarUsuario(su_codSupl: number): Observable<any> {
    return this.http.DeleteRequest(`/usuario/${su_codSupl}`, "");
  }

  buscarUsuario(claveUsuario: number): Observable<any> {
    return this.http.GetRequest<any>(`/usuario/${claveUsuario}`);
  }

  buscartodoUsuario(claveUsuario: number): Observable<ModeloUsuario> {
    return this.http.GetRequest<ModeloUsuario>("/usuario/${claveUsuario}");
  }

  buscarUsuarioPorClave(claveUsuario: string): Observable<any> {
    return this.http.GetRequest<any>(`/usuario-clave/${claveUsuario}`);
  }
}
