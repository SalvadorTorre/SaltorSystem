import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../http-invoke.service";

@Injectable({
  providedIn: "root"
})
export class ServicioReporteMovProducto {
  constructor(private http: HttpInvokeService) {}

 
buscarMovimientosPorProducto(
  codigo:string,
  desde?:string,
  hasta?:string,
  tipo?:string
){

  let url = `/movimientos-producto/${codigo}?`;

  if(desde) url += `desde=${desde}&`;
  if(hasta) url += `hasta=${hasta}&`;
  if(tipo) url += `tipo=${tipo}`;

  return this.http.GetRequest(url);

}

// buscarMovimientosPorProducto(codigo: string, desde?: string, hasta?: string): Observable<any> {

//   let url = `/movimientos-producto/${encodeURIComponent(codigo)}`;

//   const params: string[] = [];

//   if (desde) params.push(`desde=${encodeURIComponent(desde)}`);
//   if (hasta) params.push(`hasta=${encodeURIComponent(hasta)}`);

//   if (params.length > 0) {
//     url += `?${params.join('&')}`;
//   }

//   return this.http.GetRequest<any>(url);
// }
}
