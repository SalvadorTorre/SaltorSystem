import { Injectable } from "@angular/core";
import { ModeloCliente, ModeloClienteData } from ".";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";

@Injectable({
  providedIn: "root"
})
export class ServicioCliente {
  constructor(private http:HttpInvokeService) {}

  buscarTodosCliente(pageIndex: number, pageSize: number,  codigo?:string, descripcion?: string): Observable<any> {
    let url = `/cliente?page=${pageIndex}&limit=${pageSize}`;
    if (codigo) {
      url += `&codigo=${codigo}`;
    }
    if (descripcion) {
      url += `&descripcion=${descripcion}`;
    }
console.log(url);
    return this.http.GetRequest<any>(url);
  }

  guardarCliente(cliente:ModeloClienteData): Observable<any>{
    return this.http.PostRequest<any,any>("/cliente",cliente);
  }

  editarCliente(cl_codClie:number,cliente:ModeloCliente): Observable<any>{
    return this.http.PutRequest<any,any>(`/cliente/${cl_codClie}`,cliente);
  }

  eliminarCliente(cl_codClie:number): Observable<any>{
    return this.http.DeleteRequest(`/cliente/${cl_codClie}`, "");
  }

  buscarCliente(cl_codClie:number): Observable<any>{
    return this.http.GetRequest<any>(`/cliente/${cl_codClie}`);
  }

  buscarporNombre(nombre:string): Observable<ModeloCliente>{
    return this.http.GetRequest<ModeloCliente>(`/cliente-nombre/${nombre}`);
  }
}


