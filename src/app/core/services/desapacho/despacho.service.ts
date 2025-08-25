import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Despacho } from './despacho.model';

@Injectable({
  providedIn: 'root'
})
export class DespachoService {
  private apiUrl = 'http://localhost:3000/despacho'; // ajusta tu endpoint

  constructor(private http: HttpClient) { }

  buscarPorCedula(cedula: string): Observable<Despacho | null> {
    return this.http.get<Despacho | null>(`${this.apiUrl}/buscar/${cedula}`);
  }
}
