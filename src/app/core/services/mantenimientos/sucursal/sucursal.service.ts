import { SucursalesData } from 'src/app/core/services/mantenimientos/sucursal';
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { SucursalModel } from ".";
@Injectable({
  providedIn: "root"
})
export class ServicioSucursal {
  constructor(private http:HttpInvokeService) {}

  guardarSucursal(sucursal:any): Observable<any>{
    return this.http.PostRequest<any,any>("/sucursal",sucursal);
  }

  editarEmpresa(cod_sucursal:string,sucursal:SucursalModel): Observable<any>{
    return this.http.PutRequest<any,any>(`/empresa/${cod_sucursal}`,sucursal);
  }

  buscarTodasSucursal(pageIndex: number, pageSize: number,  descripcion?: string): Observable<any> {
    let url = `/sucursal?page=${pageIndex}&limit=${pageSize}`;
    if (descripcion) {
      url += `&descripcion=${descripcion}`;
    }
console.log(url);
    return this.http.GetRequest<any>(url);
  }

  eliminarsucursal(cod_sucursal:string): Observable<any>{
    return this.http.DeleteRequest(`/sucursal/${cod_sucursal}`, "");
  }

  buscarsucursal(cod_sucursal:string): Observable<any>{
    return this.http.GetRequest<any>(`/sucursal/${cod_sucursal}`);
  }



}
