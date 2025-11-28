import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";

export interface Tipousuario {
  id: number;
  descripcion?: string;
  dtipousuarios?: any[]; // relación incluida por el backend
}

@Injectable({
  providedIn: "root",
})
export class ServicioTipousuario {
  constructor(private http: HttpInvokeService) {}

  obtenerTodosTipousuario(): Observable<any> {
    return this.http.GetRequest<any>("/tipousuario");
  }

  guardarTipousuario(tipo: Partial<Tipousuario>): Observable<any> {
    return this.http.PostRequest<any, any>("/tipousuario", tipo);
  }

  editarTipousuario(id: number, tipo: Partial<Tipousuario>): Observable<any> {
    return this.http.PutRequest<any, any>(`/tipousuario/${id}`, tipo);
  }

  eliminarTipousuario(id: number): Observable<any> {
    return this.http.DeleteRequest(`/tipousuario/${id}`, "");
  }

  buscarTipousuario(id: number): Observable<any> {
    return this.http.GetRequest<any>(`/tipousuario/${id}`);
  }

  // Crear detalle dtipousuario: el backend actual espera POST /dtipousuario
  // con el idtipousuario dentro del body
  agregarDetalle(idtipousuario: number, detalle: any): Observable<any> {
    const payload = { ...detalle, idtipousuario };
    return this.http.PostRequest<any, any>(`/dtipousuario`, payload);
  }

  editarDetalle(idDetalle: number, detalle: any): Observable<any> {
    // Si el backend expone edición por id de detalle
    return this.http.PutRequest<any, any>(`/dtipousuario/${idDetalle}`, detalle);
  }

  eliminarDetalle(idDetalle: number): Observable<any> {
    return this.http.DeleteRequest(`/dtipousuario/${idDetalle}`, "");
  }
}
