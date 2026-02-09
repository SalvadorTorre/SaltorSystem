import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
 
@Injectable({
  providedIn: "root"
})
export class ServicioProducto {
  constructor(private http: HttpInvokeService) {}

  obtenerProductos(pageIndex: number, pageSize: number, codigo?: string, descripcion?: string): Observable<any> {
    let url = `/productos?page=${pageIndex}&limit=${pageSize}`;
    if (codigo) url += `&codigo=${codigo}`;
    if (descripcion) url += `&descripcion=${descripcion}`;
    return this.http.GetRequest<any>(url);
  }

  obtenerProductoPorId(in_codmerc: string | number): Observable<any> {
    return this.http.GetRequest<any>(`/productos/${in_codmerc}`);
  }

  crearProducto(payload: any): Observable<any> {
    return this.http.PostRequest<any, any>(`/productos`, payload);
  }

  eliminarProducto(in_codmerc: string | number): Observable<any> {
    return this.http.DeleteRequest(`/productos/${in_codmerc}`, '');
  }

  buscarProductosPorCodigo(in_codmerc: string): Observable<any> {
    const safe = encodeURIComponent(in_codmerc);
    return this.http.GetRequest<any>(`/productos-buscador/${safe}`);
  }

  buscarProductosPorDescripcion(in_desmerc: string): Observable<any> {
    const safe = encodeURIComponent(in_desmerc);
    return this.http.GetRequest<any>(`/productos-buscador-desc/${safe}`);
  }
}
