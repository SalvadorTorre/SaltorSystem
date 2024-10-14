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

  editarVentainterna(fa_codFact: string, ventainterna: VentainternaModel): Observable<any> {
    return this.http.PutRequest<any, any>(`/ventainterna/${fa_codFact}`, ventainterna);
  }

  buscarTodasVentainterna(pageIndex: number, pageSize: number, ): Observable<any> {
    let url = `/ventainterna?page=${pageIndex}&limit=${pageSize}`;

    console.log(url);
    return this.http.GetRequest<any>(url);
  }

  eliminarVentainterna(fa_codFact: string): Observable<any> {
    return this.http.DeleteRequest(`/eliminar-ventainterna/${fa_codFact}`, "");
  }


  buscarVentainternaPorNombre(currentPage: number, pageSize: number, fa_nomfact: string, ): Observable<any> {
    return this.http.GetRequest<any>(`/ventainterna/${fa_nomfact}`);
  }
  buscarVentainternaDetalle(df_codFact: string): Observable<any> {
    return this.http.GetRequest<any>(`/detalle-ventainterna/${df_codFact}`);
  }


 buscarVentainterna(pageIndex: number, pageSize: number, codigo?: string, nomcliente?: string, fecha?:string,): Observable<any> {
    let url = `/ventainterna-numero?page=${pageIndex}&limit=${pageSize}`;

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
