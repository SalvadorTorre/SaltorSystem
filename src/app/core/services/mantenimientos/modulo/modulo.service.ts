import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { Modulo } from "src/app/features/private/pages/mantenimientos/pages/configuracion/modulo/modelo";
@Injectable({
  providedIn: "root"
})
export class ServicioModulo {
  constructor(private http: HttpInvokeService) {}

  guardarModulo(modulo: Partial<Modulo>): Observable<any> {
    return this.http.PostRequest<any, any>("/modulo", modulo);
  }

  editarModulo(idmodulo: number, modulo: Partial<Modulo>): Observable<any> {
    return this.http.PutRequest<any, any>(`/modulo/${idmodulo}`, modulo);
  }

  eliminarModulo(idmodulo: number): Observable<any> {
    return this.http.DeleteRequest(`/modulo/${idmodulo}`, "");
  }

  buscarModulo(idmodulo: number): Observable<any> {
    return this.http.GetRequest<any>(`/modulo/${idmodulo}`);
  }

  buscarTodosModulo(pageIndex: number, pageSize: number, codigo?: string, descripcion?: string): Observable<any> {
    let url = `/modulo?page=${pageIndex}&limit=${pageSize}`;
    if (codigo) {
      url += `&codigo=${codigo}`;
    }
    if (descripcion) {
      url += `&descripcion=${descripcion}`;
    }
    return this.http.GetRequest<any>(url);
  }

  obtenerTodosModulo(): Observable<any> {
    return this.http.GetRequest<any>("/modulo");
  }
}