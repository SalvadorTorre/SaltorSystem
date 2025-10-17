import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { EmpresaModel, EmpresaModelData } from ".";

@Injectable({
  providedIn: "root"
})
export class ServicioEmpresa {
  constructor(private http: HttpInvokeService) { }

  guardarEmpresa(empresas: any): Observable<any> {
    return this.http.PostRequest<any, any>("/empresas", empresas);
  }

  editarEmpresa(cod_empre: string, empresas: EmpresaModel): Observable<any> {
    return this.http.PutRequest<any, any>(`/empresas/${cod_empre}`, empresas);
  }

  buscarTodasEmpresa(pageIndex: number, pageSize: number, descripcion?: string): Observable<any> {
    let url = `/empresas?page=${pageIndex}&limit=${pageSize}`;
    if (descripcion) {
      url += `&descripcion=${descripcion}`;
    }
    console.log(url);
    return this.http.GetRequest<any>(url);
  }

  eliminarEmpresa(cod_empre: string): Observable<any> {
    return this.http.DeleteRequest(`/empresas/${cod_empre}`, "");
  }

  buscarEmpres(cod_empre: string): Observable<any> {
    return this.http.GetRequest<any>(`/empresas/${cod_empre}`);
  }

  buscarEmpresa(pageIndex: number, pageSize: number, codigo?: string, nomempresa?: string,): Observable<any> {
    let url = `/empresas-nombre?page=${pageIndex}&limit=${pageSize}`;

    if (codigo) {
      url += `&codigo=${codigo}`;
    }
    if (nomempresa) {
      url += `&nomempresa=${nomempresa}`;
    }

    return this.http.GetRequest<any>(url);
  }

}

