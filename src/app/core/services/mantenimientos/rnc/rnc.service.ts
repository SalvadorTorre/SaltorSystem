import { Injectable } from '@angular/core';
import { ModeloRnc, ModeloRncData } from '.';
import { Observable, from, of, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpInvokeService } from '../../http-invoke.service';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable({
  providedIn: 'root',
})
export class ServicioRnc {
  constructor(
    private http: HttpInvokeService,
    private supabase: SupabaseService,
  ) {}

  consultarRncMegaplus(rnc: string): Observable<any> {
    const limpio = String(rnc || '').replace(/[^0-9]/g, '');
    if (!limpio) return of({ error: true, mensaje: 'Parametro rnc requerido' });
    const client = this.supabase.client;
    if (!client) return throwError(() => new Error('Supabase no está configurado'));
    return from(client.functions.invoke('consulta-rnc-megaplus', {
      body: { rnc: limpio },
    })).pipe(
      map(({ data, error }: any) => {
        if (error) throw error;
        const normalizar = (row: any) => row && typeof row === 'object'
          ? {
              ...row,
              rason: row.rason ?? row.razon ?? row.razonSocial ?? row.nombre_razon_social ?? row.nombre,
            }
          : row;
        const normalizado = Array.isArray(data)
          ? data.map(normalizar)
          : normalizar(data);
        return { status: 'success', code: 200, data: normalizado };
      }),
    );
  }

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
    return this.consultarRncMegaplus(String(rnc));
  }

  buscartodoRnc(rnc: number): Observable<ModeloRnc> {
    return this.consultarRncMegaplus(String(rnc)) as Observable<ModeloRnc>;
  }

  buscarRncPorId(rnc: string): Observable<any> {
    return this.consultarRncMegaplus(rnc);
  }

  buscarRncPorrncId(rnc: string): Observable<any> {
    return this.consultarRncMegaplus(rnc);
  }

  importarDgii(): Observable<any> {
    return this.http.PostRequest<any, any>('/rnc/importar-dgii', {});
  }
}
