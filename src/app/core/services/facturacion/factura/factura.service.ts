import { Injectable } from "@angular/core";
import { ModeloFactura, ModeloFacturaData } from ".";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";

@Injectable({
  providedIn: "root"
})
export class ServicioFactura {
  constructor(private http:HttpInvokeService) {}

  buscarTodasFactura(pageIndex: number, pageSize: number,  codigo?:string, nombre                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         ?: string): Observable<any> {
    let url = `/Factura?page=${pageIndex}&limit=${pageSize}`;
    if (codigo) {
      url += `&codigo=${codigo}`;
    }
    if (nombre) {
      url += `&nombre=${nombre}`;
    }
console.log(url);
    return this.http.GetRequest<any>(url);
  }

  guardarFactura(factura:ModeloFactura): Observable<any>{
    return this.http.PostRequest<any,any>("/factura",factura);
  }

  editarFactura(fa_codFact:string,factura:ModeloFactura): Observable<any>{
    return this.http.PutRequest<any,any>(`/factura/${fa_codFact}`,factura);
  }

  anularFactura(fa_codFact:string): Observable<any>{
    return this.http.DeleteRequest(`/factura/${fa_codFact}`, "");
  }

  buscarFactura(fa_codFact:string): Observable<any>{
    return this.http.GetRequest<any>(`/factura{fa_codFact}`);
  }

  buscartodafactura(): Observable<ModeloFactura>{
    return this.http.GetRequest<ModeloFactura>("/factura");
  }
}

