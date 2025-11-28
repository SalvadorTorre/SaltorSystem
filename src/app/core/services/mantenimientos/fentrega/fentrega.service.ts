import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { ModeloFentrega, ModeloFentregaData } from ".";

@Injectable({
  providedIn: "root",
})
export class ServicioFentrega {
  constructor(private http: HttpInvokeService) {}

  guardarFentrega(fentrega: Partial<ModeloFentregaData>): Observable<any> {
    return this.http.PostRequest<any, any>("/fentrega", fentrega);
  }

  editarFentrega(idfentrega: number, fentrega: Partial<ModeloFentregaData>): Observable<any> {
    return this.http.PutRequest<any, any>(`/fentrega/${idfentrega}`, fentrega);
  }

  eliminarFentrega(idfentrega: number): Observable<any> {
    return this.http.DeleteRequest(`/fentrega/${idfentrega}`, "");
  }

  buscarTodosFentrega(pageIndex: number, pageSize: number, descripcion?: string): Observable<any> {
    let url = `/fentrega?page=${pageIndex}&limit=${pageSize}`;
    if (descripcion) {
      url += `&descripcion=${descripcion}`;
    }
    return this.http.GetRequest<any>(url);
  }

  obtenerTodosFentrega(): Observable<ModeloFentrega> {
    return this.http.GetRequest<ModeloFentrega>("/fentrega");
  }

  obtenerFentregaPorId(id: number | string): Observable<ModeloFentrega> {
    return this.http.GetRequest<ModeloFentrega>(`/fentrega/${id}`);
  }
}