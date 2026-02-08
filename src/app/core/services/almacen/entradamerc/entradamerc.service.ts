import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { EntradamercModel, EntradamercModelData } from ".";
import { HttpParams } from "@angular/common/http";

@Injectable({
  providedIn: "root"
})
export class ServicioEntradamerc {
  constructor(private http: HttpInvokeService) { }

  guardarEntradamerc(entradamerc: any): Observable<any> {
    return this.http.PostRequest<any, any>("/entradamerc", entradamerc);
  }
  editarEntradamerc(me_codEntr: string, entradamerc: EntradamercModel): Observable<any> {
    return this.http.PutRequest<any, any>(`/entradamerc/${me_codEntr}`, entradamerc);
  }

  buscarTodasEntradamerc(pageIndex: number, pageSize: number, ): Observable<any> {
    let url = `/entradamerc?page=${pageIndex}&limit=${pageSize}`;

    console.log(url);
    return this.http.GetRequest<any>(url);
  }

  eliminarEntradamerc(me_codEntr: string): Observable<any> {
    return this.http.DeleteRequest(`/eliminar-entradamerc/${me_codEntr}`, "");
  }


  buscarEntradamercPorNombre(currentPage: number, pageSize: number, me_nomEntr: string, ): Observable<any> {
    return this.http.GetRequest<any>(`/entradamerc/${me_nomEntr}`);
  }
  buscarEntradamercDetalle(me_codEntr: string): Observable<any> {
    return this.http.GetRequest<any>(`/detalle-entradamerc/${me_codEntr}`);
  }
  buscarEntradamercDetalleSilent(me_codEntr: string): Observable<any> {
    return this.http.GetRequest<any>(`/detalle-entradamerc/${me_codEntr}`, false);
  }

 buscarEntradamerc(pageIndex: number, pageSize: number, codigo?: string, nomcliente?: string, fecha?:string,): Observable<any> {
    let url = `/entradamerc-numero?page=${pageIndex}&limit=${pageSize}`;

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

  buscarEntradamercSilent(pageIndex: number, pageSize: number, codigo?: string, nomcliente?: string, fecha?: string): Observable<any> {
    let params = new HttpParams()
      .set('page', String(pageIndex))
      .set('limit', String(pageSize));
    if (codigo) params = params.set('codigo', codigo);
    if (nomcliente) params = params.set('nomcliente', nomcliente);
    if (fecha) params = params.set('fecha', fecha);
    return this.http.get('/entradamerc-numero', params);
  }

}
