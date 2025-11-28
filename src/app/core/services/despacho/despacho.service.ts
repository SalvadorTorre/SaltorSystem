import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Despacho } from './despacho.model';
import { HttpInvokeService } from '../http-invoke.service';

@Injectable({
  providedIn: 'root',
})
export class DespachoService {
  // private apiUrl = 'http://localhost:3000/despachsdores'; // ajusta tu endpoint

  // constructor(private http: HttpClient) { }

  // buscarPorCedula(cedula: string): Observable<Despacho | null> {
  //   return this.http.get<Despacho | null>(`${this.apiUrl}/buscar/${cedula}`);
  // }

  constructor(private http: HttpInvokeService) {}

  buscarPorCedula(cedula: string): Observable<any> {
    return this.http.GetRequest(`/despachadores/cedula/${cedula}`);
  }
}
