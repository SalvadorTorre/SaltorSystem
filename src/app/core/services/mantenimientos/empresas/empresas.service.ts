import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { ModeloEmpresa, ModeloEmpresaData } from ".";

@Injectable({
  providedIn: "root"
})
export class ServicioEmpresa {
  constructor(private http:HttpInvokeService) {}

  guardarEmpresa(empresas:any): Observable<any>{
    return this.http.PostRequest<any,any>("/Empresas",sector);
  }

  editarEmpresa(cod_empre:number,empresas:ModeloEmpresa): Observable<any>{
    return this.http.PutRequest<any,any>(`/chofer/${cod_empre}`,empresas);
  }

  buscarTodasEmpresa(pageIndex: number, pageSize: number,  descripcion?: string): Observable<any> {
    let url = `/empresas?page=${pageIndex}&limit=${pageSize}`;
    if (descripcion) {
      url += `&descripcion=${descripcion}`;
    }
console.log(url);
    return this.http.GetRequest<any>(url);
  }

  eliminarEmpresa(cod_empre:number): Observable<any>{
    return this.http.DeleteRequest(`/chofer/${cod_empre}`, "");
  }

  buscarEmpres(cod_empre:number): Observable<any>{
    return this.http.GetRequest<any>(`/empresas/${cod_empre}`);
  }

  

}