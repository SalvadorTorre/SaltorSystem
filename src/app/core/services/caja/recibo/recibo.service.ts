import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpInvokeService } from '../../http-invoke.service';

export interface ReciboData {
  id?: number;
  fecha: string | Date; // Backend expects Date or string compatible with Date
  cantidad: number;
  nombre: string;
  concepto: string;
  fpago: number;
}

export interface ReciboResponse {
  status: string;
  code: number;
  message: string;
  data: ReciboData | ReciboData[];
}

@Injectable({
  providedIn: 'root'
})
export class ServicioRecibo {
  constructor(private http: HttpInvokeService) { }

  crearRecibo(data: ReciboData): Observable<ReciboResponse> {
    return this.http.PostRequest<ReciboResponse, ReciboData>('/recibos', data);
  }

  obtenerRecibos(): Observable<ReciboResponse> {
    return this.http.GetRequest<ReciboResponse>('/recibos');
  }

  obtenerReciboPorId(id: number): Observable<ReciboResponse> {
    return this.http.GetRequest<ReciboResponse>(`/recibos/${id}`);
  }

  actualizarRecibo(id: number, data: ReciboData): Observable<ReciboResponse> {
    return this.http.PutRequest<ReciboResponse, ReciboData>(`/recibos/${id}`, data);
  }

  eliminarRecibo(id: number): Observable<ReciboResponse> {
    return this.http.DeleteRequest<ReciboResponse, any>(`/recibos/${id}`, {});
  }
}