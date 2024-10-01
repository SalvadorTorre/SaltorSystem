import { ServicioEntradamerc } from './entradamerc.service';
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { EntradamercModel, EntradamercModelData } from ".";

@Injectable({
  providedIn: "root"
})
export class ServicioEntradamerc {
  constructor(private http: HttpInvokeService) { }

  guardarCotizacion(entradamerc: any): Observable<any> {
    return this.http.PostRequest<any, any>("/entradamerc", entradamerc);
  }

  editarEntradamerc(me_codentr: string, entradamerc: EntradamercModel): Observable<any> {
    return this.http.PutRequest<any, any>(`/entradamerc/${me_codentr}`, entradamerc);
  }

  buscarTodasEntradamerc(pageIndex: number, pageSize: number, ): Observable<any> {
    let url = `/entradamerc?page=${pageIndex}&limit=${pageSize}`;

    console.log(url);
    return this.http.GetRequest<any>(url);
  }

  eliminarEntradamerc(me_codentr: string): Observable<any> {
    return this.http.DeleteRequest(`/eliminar-entradamerc/${me_codentr}`, "");
  }


  buscarEntradamercPorNombre(currentPage: number, pageSize: number, me_nomentr: string, ): Observable<any> {
    return this.http.GetRequest<any>(`/entradamerc/${me_nomentr}`);
  }
  buscarEntradamercDetalle(me_codentr: string): Observable<any> {
    return this.http.GetRequest<any>(`/detalle-entradamerc/${me_codentr}`);
  }

 buscarCotizacion(pageIndex: number, pageSize: number, codigo?: string, nomcliente?: string, fecha?:string,): Observable<any> {
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

}
