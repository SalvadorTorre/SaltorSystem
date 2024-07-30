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
    return this.http.PostRequest<any,any>("/empresa",empresas);
  }

  editarEmpresa(cod_empre:number,empresas:ModeloEmpresa): Observable<any>{
    return this.http.PutRequest<any,any>(`/empresa/${cod_empre}`,empresas);
  }

  buscarTodasEmpresa(pageIndex: number, pageSize: number,  descripcion?: string): Observable<any> {
    let url = `/empresa?page=${pageIndex}&limit=${pageSize}`;
    if (descripcion) {
      url += `&descripcion=${descripcion}`;
    }
console.log(url);
    return this.http.GetRequest<any>(url);
  }

  eliminarEmpresa(cod_empre:number): Observable<any>{
    return this.http.DeleteRequest(`/empresa/${cod_empre}`, "");
  }

  buscarEmpres(cod_empre:number): Observable<any>{
    return this.http.GetRequest<any>(`/empresa/${cod_empre}`);
  }



}
