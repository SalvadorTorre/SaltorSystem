import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";

@Injectable({
  providedIn: "root",
})
export class ServicioEncf {
  constructor(private http: HttpInvokeService) {}

  listarEncf(page: number = 1, limit: number = 10, codigo?: string, descripcion?: string): Observable<any> {
    let url = `/encf?page=${page}&limit=${limit}`;
    if (codigo) {
      url += `&codigo=${codigo}`;
    }
    if (descripcion) {
      url += `&descripcion=${descripcion}`;
    }
    return this.http.GetRequest<any>(url);
  }

  crearEncf(data: any): Observable<any> {
    return this.http.PostRequest<any, any>("/encf", data);
  }

  eliminarEncf(id: number): Observable<any> {
    return this.http.DeleteRequest(`/encf/${id}`, "");
  }

  obtenerEncfPorEmpresaId(codempr: string): Observable<any> {
    return this.http.GetRequest<any>(`/encf/${codempr}`);
  }

  obtenerEncfPorTipo(tipoencf: string): Observable<any> {
    // Según el controlador proporcionado, este endpoint devuelve un array simple
    return this.http.GetRequest<any>(`/encf/tipo/${tipoencf}`);
  }
}