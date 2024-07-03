import { Injectable } from "@angular/core";
import { ModeloCliente } from ".";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";

@Injectable({
  providedIn: "root"
})
export class ServicioCliente {
  constructor(private http:HttpInvokeService) {}

  obtenerTodosCliente(): Observable<ModeloCliente>{
    return this.http.GetRequest<ModeloCliente>("/clientes");
  }
  guardarCliente(cliente:ModeloCliente): Observable<any>{
    return this.http.PostRequest<any,any>("/clientes",cliente);
  }

  editarCliente(cl_codClie:number,cliente:ModeloCliente): Observable<any>{
    return this.http.PutRequest<any,any>(`/clientes/${cl_codClie}`,cliente);
  }

  eliminarCliente(cl_codClie:number): Observable<any>{
    return this.http.DeleteRequest(`/clientes/${cl_codClie}`, "");
  }

  consultarCliente(cl_codClie:number): Observable<any>{
    return this.http.GetRequest<any>(`/clientes/${cl_codClie}`);
  }

  consultarClientes(): Observable<ModeloCliente>{
    return this.http.GetRequest<ModeloCliente>("/clientes");
  }
}
