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
  obtenerTodosInventario(): Observable<ModeloInventario>{
    return this.http.GetRequest<ModeloInventario>("/productos");
  }
}
