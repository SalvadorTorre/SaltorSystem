import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { FacturacionModel, FacturacionModelData } from ".";

@Injectable({
  providedIn: "root"
})
export class ServicioFacturacion {
  constructor(private http: HttpInvokeService) { }

  guardarFacturacion(datosParaGuardar: any): Observable<any> {
    return this.http.PostRequest<any, any>("/facturacion", datosParaGuardar);
  }


  // editarFacturacion(fa_codFact: string, facturacion: FacturacionModel): Observable<any> {
  //   return this.http.PutRequest<any, any>(`/facturacion/${fa_codFact}`, facturacion);
  // }

  editarFacturacion(payload: any) {
  const cod = payload.factura.fa_codFact;
  return this.http.PutRequest(`/facturacion/${cod}`, payload);
}

  buscarTodasFacturacion( ): Observable<any> {
    let url = `/facturacion`;

    console.log(url);
    return this.http.GetRequest<any>(url);
  }

  eliminarFacturacion(fa_codFact: string): Observable<any> {
    return this.http.DeleteRequest(`/eliminar-facturacion/${fa_codFact}`, "");
  }


  buscarFacturacionPorNombre(currentPage: number, pageSize: number, fa_nomClie: string, ): Observable<any> {
    return this.http.GetRequest<any>(`/facturacion/${fa_nomClie}`);
  }
  buscarFacturaDetalle(df_codFact: string): Observable<any> {
    return this.http.GetRequest<any>(`/detalle-factura/${df_codFact}`);
  }


 buscarFacturacion(pageIndex: number, pageSize: number, codigo?: string, nomcliente?: string, fecha?:string,): Observable<any> {
    let url = `/facturacion-numero?page=${pageIndex}&limit=${pageSize}`;

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
