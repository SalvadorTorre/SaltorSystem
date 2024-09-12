import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { CotizacionModel, CotizacionModelData } from ".";

@Injectable({
  providedIn: "root"
})
export class ServicioCotizacion {
  constructor(private http: HttpInvokeService) { }

  guardarCotizacion(cotizacion: any): Observable<any> {
    return this.http.PostRequest<any, any>("/cotizacion", cotizacion);
  }

  editarCotizacion(ct_codcoti: string, cotizacion: CotizacionModel): Observable<any> {
    return this.http.PutRequest<any, any>(`/cotizacion/${ct_codcoti}`, cotizacion);
  }

  buscarTodasCotizacion(pageIndex: number, pageSize: number): Observable<any> {
    let url = `/cotizacion?page=${pageIndex}&limit=${pageSize}`;

    console.log(url);
    return this.http.GetRequest<any>(url);
  }

  eliminarCotizacion(ct_codcoti: string): Observable<any> {
    return this.http.DeleteRequest(`/cotizacion/$ct_codcoti}`, "");
  }

  buscarCotizacion(ct_codcoti: string): Observable<any> {
    return this.http.GetRequest<any>(`/cotizacion/${ct_codcoti}`);
  }

  buscarCotizacionDetalle(dc_codcoti: string): Observable<any> {
    return this.http.GetRequest<any>(`/detalle-cotizacion/${dc_codcoti}`);
  }



}
