import { Inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ModeloFpago } from ".";
import { HttpInvokeService } from "../../http-invoke.service";

@Injectable({
  providedIn: "root"
})
export class ServicioFpago {
  constructor(private http: HttpInvokeService) { }

  // export class ServicioFpago {
  //   constructor(@Inject(HttpInvokeService) private http: HttpInvokeService) { }


  guardarFpago(fpago: any): Observable<any> {
    return this.http.PostRequest<any, any>("/fpago", fpago);
  }

  editarFpago(fp_codfpago: number, fpago: ModeloFpago): Observable<any> {
    return this.http.PutRequest<any, any>(`/fpago/${fp_codfpago}`, fp_codfpago);
  }
  eliminarfpago(fp_codfpago: number): Observable<any> {
    return this.http.DeleteRequest(`/fpago/${fp_codfpago}`, "");
  }

  buscarTodosFpago(pageIndex: number, pageSize: number, descripcion?: string): Observable<any> {
    let url = `/fpago?page=${pageIndex}&limit=${pageSize}`;
    if (descripcion) {
      url += `&descripcion=${descripcion}`;
    }
    return this.http.GetRequest<any>(url);
  }


  obtenerTodosFpago(): Observable<ModeloFpago> {
    return this.http.GetRequest<ModeloFpago>("/fpago");
  }
}
