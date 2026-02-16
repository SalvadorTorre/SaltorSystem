import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { VentainternaModel, VentainternaModelData } from ".";

@Injectable({
  providedIn: "root"
})
export class ServicioVentainterna {
  constructor(private http: HttpInvokeService) { }

  guardarVentainterna(ventainterna: any): Observable<any> {
    return this.http.PostRequest<any, any>("/ventainterna", ventainterna);
  }

  editarVentainterna(fa_codFact: string, payload: any): Observable<any> {
    return this.http.PutRequest<any, any>(`/ventainterna/${fa_codFact}`, payload);
  }

  buscarTodasVentainterna(pageIndex: number, pageSize: number, ): Observable<any> {
    let url = `/ventainterna?page=${pageIndex}&limit=${pageSize}`;

    console.log(url);
    return this.http.GetRequest<any>(url);
  }

  // Búsqueda exacta por número de venta interna
  buscarVentainternaPorNumero(fa_codFact: string): Observable<any> {
    return this.http.GetRequest<any>(`/ventainterna/${fa_codFact}`);
  }

  // s
  // Buscar por nombre de cliente (ruta específica del backend)
  buscarVentainternaPorNombreCliente(fa_nomClie: string): Observable<any> {
    return this.http.GetRequest<any>(`/ventainterna-buscador-cliente/${fa_nomClie}`);
  }
  buscarVentainternaDetalle(df_codFact: string): Observable<any> {
    return this.http.GetRequest<any>(`/detalle-ventainterna/${df_codFact}`);
  }


  buscarVentainterna(pageIndex: number, pageSize: number, codigo?: string, nomcliente?: string, fecha?:string,): Observable<any> {
    // Alinear con las rutas del backend: GET /api/ventainterna
    let url = `/ventainterna?page=${pageIndex}&limit=${pageSize}`;

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

  eliminarVentainterna(fa_codFact: string): Observable<any> {
    return this.http.PatchRequest(`/ventainterna-anular/${fa_codFact}`, {});
  }

}
