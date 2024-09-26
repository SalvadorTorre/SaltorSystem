import { SucursalesData } from 'src/app/core/services/mantenimientos/sucursal';
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { SucursalModel } from ".";
@Injectable({
  providedIn: "root"
})
export class ServicioSucursal {
  constructor(private http: HttpInvokeService) { }

  guardarSucursal(sucursal: any): Observable<any> {
    return this.http.PostRequest<any, any>("/sucursales", sucursal);
  }

  editaSucursal(cod_sucursal: string, sucursal: SucursalModel): Observable<any> {
    return this.http.PutRequest<any, any>(`/sucursales/${cod_sucursal}`, sucursal);
  }

  buscarTodasSucursal(): Observable<any> {
    let url = `/sucursales`;

    console.log(url);
    return this.http.GetRequest<any>(url);
  }

  eliminarSucursal(cod_sucursal: string): Observable<any> {
    return this.http.DeleteRequest(`/sucursal/${cod_sucursal}`, "");
  }

  buscarsucursal(cod_sucursal: string): Observable<any> {
    return this.http.GetRequest<any>(`/sucursal/${cod_sucursal}`);
  }


}
