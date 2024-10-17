import { Facturacion } from './../../../../features/private/pages/facturacion/facturacion';
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { FacturacionModel, FacturacionModelData } from ".";

@Injectable({
  providedIn: "root"
})
export class ServicioFacturacion {
  constructor(private http: HttpInvokeService) { }

  guardarFacturacion(facturacio: any): Observable<any> {
    return this.http.PostRequest<any, any>("/facturacio", facturacio);
  }

  editarFacturacion(fa_codFact: string, facturacio: FacturacionModel): Observable<any> {
    return this.http.PutRequest<any, any>(`/facturacio/${fa_codFact}`, facturacio);
  }

  buscarTodasFacturacion(pageIndex: number, pageSize: number, ): Observable<any> {
    let url = `/facturacio?page=${pageIndex}&limit=${pageSize}`;

    console.log(url);
    return this.http.GetRequest<any>(url);
  }

  eliminarFacturacion(fa_codFact: string): Observable<any> {
    return this.http.DeleteRequest(`/eliminar-facturacio/${fa_codFact}`, "");
  }


  buscarFacturacionPorNombre(currentPage: number, pageSize: number, fa_nomClie: string, ): Observable<any> {
    return this.http.GetRequest<any>(`/facturacio/${fa_nomClie}`);
  }
  buscarFacturDetalle(df_codFact: string): Observable<any> {
    return this.http.GetRequest<any>(`/detalle-facturacio/${df_codFact}`);
  }


 buscarFacturacion(pageIndex: number, pageSize: number, codigo?: string, nomcliente?: string, fecha?:string,): Observable<any> {
    let url = `/facturacio-numero?page=${pageIndex}&limit=${pageSize}`;

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
