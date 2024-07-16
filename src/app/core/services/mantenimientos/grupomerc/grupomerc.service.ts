import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { ModeloGrupoMercancias, ModeloGrupoMercanciasData } from ".";

@Injectable({
  providedIn: "root"
})
export class ServicioGrupoMercancias {
  constructor(private http:HttpInvokeService) {}

  guardarGrupoMercancias(inventario:ModeloGrupoMercanciasData): Observable<any>{
    return this.http.PostRequest<any,any>("/grupomerc",inventario);
  }

  editarGrupoMercancias(in_codmerc:number,inventario:ModeloGrupoMercanciasData): Observable<any>{
    return this.http.PutRequest<any,any>(`/grupomerc/${in_codmerc}`,inventario);
  }
  obtenerGrupoMercancias(): Observable<ModeloGrupoMercancias>{
    return this.http.GetRequest<ModeloGrupoMercancias>("/grupomerc");
  }
}
