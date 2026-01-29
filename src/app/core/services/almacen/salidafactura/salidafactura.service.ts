import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpInvokeService } from '../../http-invoke.service';

@Injectable({
  providedIn: 'root'
})
export class ServicioSalidafactura {

  constructor(private http: HttpInvokeService) { }

  guardarSalida(payload: any): Observable<any> {
    return this.http.PostRequest<any, any>('/controlsalida', payload);
  }

  // Optional: Endpoint specific for validation if backend supports it
  validarFactura(codFact: string): Observable<any> {
    return this.http.GetRequest<any>(`/factura-para-salida/${codFact}`);
  }

  obtenerPorChoferYStatus(codChofer: string, status: string = 'P'): Observable<any> {
    return this.http.GetRequest<any>(`/controlsalida/chofer-status/${codChofer}?status=${status}`);
  }

  editarSalida(id: number, payload: any): Observable<any> {
    return this.http.PutRequest<any, any>(`/controlsalida/${id}`, payload);
  }
}
