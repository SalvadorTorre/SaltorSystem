import { Injectable } from '@angular/core';
import { ModeloRnc, ModeloRncData } from '.';
import { Observable } from 'rxjs';
import { HttpInvokeService } from '../../http-invoke.service';

@Injectable({
  providedIn: 'root',
})
export class ServicioRnc {
  constructor(private http: HttpInvokeService) {}

  buscarTodosRnc(
    pageIndex: number,
    pageSize: number,
    search?: string
  ): Observable<any> {
    let url = `/rnc?page=${pageIndex}&limit=${pageSize}`;
    if (search) {
      url += `&search=${search}`;
    }
    return this.http.GetRequest<any>(url);
  }

  guardaRnc(rnc: ModeloRncData): Observable<any> {
    return this.http.PostRequest<any, any>('/rnc', rnc);
  }

  editarRnc(id: number, rnc: any): Observable<any> {
    return this.http.PutRequest<any, any>(`/rnc/${id}`, rnc);
  }

  eliminarRnc(rnc: number): Observable<any> {
    return this.http.DeleteRequest(`/rnc/${rnc}`, '');
  }

  buscarrnc(rnc: number): Observable<any> {
    return this.http.GetRequest<any>(`/rnc/${rnc}`);
  }

  buscartodoRnc(rnc: number): Observable<ModeloRnc> {
    return this.http.GetRequest<ModeloRnc>('/rnc/${rnc}');
  }

  buscarRncPorId(rnc: string): Observable<any> {
    return this.http.GetRequest<any>(`/rnc-id/${rnc}`);
  }
  buscarRncPorrncId(rnc: string): Observable<any> {
    return this.http.GetRequest<any>(`/rncid/${rnc}`);
  }

  importarDgii(): Observable<any> {
    return this.http.PostRequest<any, any>('/rnc/importar-dgii', {});
  }
}
