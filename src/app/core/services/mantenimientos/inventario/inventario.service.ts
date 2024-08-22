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

  buscarPorCodigoMerc(codigo:string): Observable<any>{
    return this.http.GetRequest<any>(`/productos-buscador/${codigo}`);
  }
}
