import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { SalidafacturaModel, SalidafacturaModelData } from ".";

@Injectable({
  providedIn: "root"
})
export class ServicioSalidafactura {
  constructor(private http: HttpInvokeService) { }

  guardarSalidafactura(salidafactura: any): Observable<any> {
    return this.http.PostRequest<any, any>("/salidafactura", salidafactura);
  }
  editarSalidafacturac(codSalida: string, salidafactura: SalidafacturaModel): Observable<any> {
    return this.http.PutRequest<any, any>(`/salidafactura/${codSalida}`, salidafactura);
  }

  buscarTodasSalidafactura(pageIndex: number, pageSize: number,): Observable<any> {
    let url = `/saidafactura?page=${pageIndex}&limit=${pageSize}`;

    console.log(url);
    return this.http.GetRequest<any>(url);
  }

  eliminarSalidafactura(codSalida: string): Observable<any> {
    return this.http.DeleteRequest(`/eliminar-salidafactura/${codSalida}`, "");
  }


  buscarSalidafacturaPorchofer(currentPage: number, pageSize: number, nomChofer: string,): Observable<any> {
    return this.http.GetRequest<any>(`/entradamerc/${nomChofer}`);
  }


  buscarSalidafactura(pageIndex: number, pageSize: number, codigo?: string, codFact?: string,): Observable<any> {
    let url = `/saidafactura?page=${pageIndex}&limit=${pageSize}`;
    if (codigo) {
      url += `&codigo=${codigo}`;
    }
    if (codFact) {
      url += `&numFact=${codFact}`;
    }

    return this.http.GetRequest<any>(url);
  }

}
