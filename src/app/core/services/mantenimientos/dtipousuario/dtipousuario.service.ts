import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";

export interface Dtipousuario {
  id: number;
  idtipousuario?: number;
  idmodulo?: number;
  lectura?: string; // S/N
  acceso?: string;  // S/N
}

@Injectable({
  providedIn: "root",
})
export class ServicioDtipousuario {
  constructor(private http: HttpInvokeService) {}

  obtenerTodosDtipousuario(): Observable<any> {
    return this.http.GetRequest<any>("/dtipousuario");
  }

  guardarDtipousuario(det: Partial<Dtipousuario>): Observable<any> {
    return this.http.PostRequest<any, any>("/dtipousuario", det);
  }

  editarDtipousuario(id: number, det: Partial<Dtipousuario>): Observable<any> {
    return this.http.PutRequest<any, any>(`/dtipousuario/${id}`, det);
  }

  eliminarDtipousuario(id: number): Observable<any> {
    return this.http.DeleteRequest(`/dtipousuario/${id}`, "");
  }

  buscarDtipousuario(id: number): Observable<any> {
    return this.http.GetRequest<any>(`/dtipousuario/${id}`);
  }
}