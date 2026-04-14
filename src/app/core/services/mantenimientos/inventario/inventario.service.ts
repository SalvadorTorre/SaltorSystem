import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { ModeloInventario, ModeloInventarioData } from ".";

@Injectable({
  providedIn: "root"
})
export class ServicioInventario {
  constructor(private http:HttpInvokeService) {}

  guardarInventario(inventario:ModeloInventarioData): Observable<any>{
    return this.http.PostRequest<any,any>("/productos",inventario);
  }

  editarInventario(in_codmerc:number,inventario:ModeloInventarioData): Observable<any>{
    return this.http.PutRequest<any,any>(`/productos/${in_codmerc}`,inventario);
  }
  obtenerTodosInventario(pageIndex: number, pageSize: number, codigo?: string, descripcion?: string): Observable<any> {
    let url = `/productos?page=${pageIndex}&limit=${pageSize}`;

    if (codigo) {
      url += `&codigo=${codigo}`;
    }
    if (descripcion) {
      url += `&descripcion=${descripcion}`;
    }

    return this.http.GetRequest<any>(url);
  }

  borrarDeInventario(in_codmerc:number): Observable<any>{
    return this.http.DeleteRequest(`/productos/${in_codmerc}`, '');
  }

  buscarporCodigoMerc(codigo:string): Observable<any>{
    const safe = encodeURIComponent(codigo);
    return this.http.GetRequest<any>(`/productos-buscador/${safe}`);
  }
  buscarPorDescripcionMerc(descripcion:string): Observable<any>{
    const safe = encodeURIComponent(descripcion);
    return this.http.GetRequest<any>(`/productos-buscador-desc/${safe}`);
  }
 
  obtenerProductoPorId(codigo: string): Observable<any> {
    const safe = encodeURIComponent(codigo);
    return this.http.GetRequest<any>(`/productos/${safe}`);
  }

  ajustarExistencia(payload: { inv_codsucu: number; inv_codprod: string; cantidad: number; tipo_movimiento: 'entrada' | 'salida'; }): Observable<any> {
    return this.http.PatchRequest<any, any>(`/inventario/ajustar-existencia`, payload);
  }

  crearInventario(payload: { inv_codsucu: number; inv_codprod: string; inv_existencia: number; inv_desprod?: string | null; inv_cosprod?: number | null; inv_preprod?: number | null; }): Observable<any> {
    return this.http.PostRequest<any, any>(`/inventario`, payload);
  }

  obtenerExistenciaPorProductoSucursal(codigo: string, sucursal: number | string): Observable<any> {
    const cod = encodeURIComponent(codigo);
    const suc = encodeURIComponent(String(sucursal));
    const url = `/inventario?inv_codprod=${cod}&inv_codsucu=${suc}`;
    return this.http.GetRequest<any>(url);
  }
  buscarInventario(codsucu: number, buscar: string) {

  const url = `/inventario/buscar/${codsucu}?buscar=${buscar}`;

  return this.http.GetRequest<any>(url);

}
}
