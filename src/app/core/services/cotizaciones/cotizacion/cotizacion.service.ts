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

  buscarTodasCotizacion(pageIndex: number, pageSize: number, ): Observable<any> {
    let url = `/cotizacion?page=${pageIndex}&limit=${pageSize}`;

    console.log(url);
    return this.http.GetRequest<any>(url);
  }

  eliminarCotizacion(ct_codcoti: string): Observable<any> {
    return this.http.DeleteRequest(`/eliminar-cotizacion/${ct_codcoti}`, "");
  }

  // buscarCotizacion(ct_codcoti: string): Observable<any> {
  //   return this.http.GetRequest<any>(`/cotizacion/${ct_codcoti}`);
  // }
  buscarCotizacionPorNombre(currentPage: number, pageSize: number, ct_nomcoti: string, ): Observable<any> {
    return this.http.GetRequest<any>(`/cotizacion/${ct_nomcoti}`);
  }
  buscarCotizacionDetalle(dc_codcoti: string): Observable<any> {
    return this.http.GetRequest<any>(`/detalle-cotizacion/${dc_codcoti}`);
  }

 buscarCotizacion(pageIndex: number, pageSize: number, codigo?: string, nomcliente?: string, fecha?:string,): Observable<any> {
    let url = `/cotizacion-numero?page=${pageIndex}&limit=${pageSize}`;

    if (codigo) {
      url += `&codigo=${codigo}`;
    }
    if (nomcliente) {
      url += `&nomcliente=${nomcliente}`;
    }
    if (fecha) {
      url += `&fecha=${fecha}`;
    }
    return this.http.GetRequest<any>(url);
  }

}
