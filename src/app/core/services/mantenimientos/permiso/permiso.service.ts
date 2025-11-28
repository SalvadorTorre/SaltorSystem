import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { Permiso } from "src/app/features/private/pages/mantenimientos/pages/configuracion/permiso/modelo";

@Injectable({
  providedIn: "root"
})
export class ServicioPermiso {
  constructor(private http: HttpInvokeService) {}

  obtenerTodosPermiso(): Observable<any> {
    return this.http.GetRequest<any>("/permiso");
  }

  guardarPermiso(permiso: Partial<Permiso>): Observable<any> {
    return this.http.PostRequest<any, any>("/permiso", permiso);
  }

  editarPermiso(idpermiso: number, permiso: Partial<Permiso>): Observable<any> {
    return this.http.PutRequest<any, any>(`/permiso/${idpermiso}`, permiso);
  }

  eliminarPermiso(idpermiso: number): Observable<any> {
    return this.http.DeleteRequest(`/permiso/${idpermiso}`, "");
  }

  buscarPermiso(idpermiso: number): Observable<any> {
    return this.http.GetRequest<any>(`/permiso/${idpermiso}`);
  }
}