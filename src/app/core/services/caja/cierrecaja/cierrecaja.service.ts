import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpInvokeService } from '../../http-invoke.service';

@Injectable({
  providedIn: 'root'
})
export class ServicioCierreCaja {
  constructor(private http: HttpInvokeService) {}

  obtenerUltimoCierre(): Observable<any> {
    return this.http.GetRequest<any>('/cierrecaja');
  }

  crearCierre(data: any): Observable<any> {
    return this.http.PostRequest<any, any>('/cierrecaja', data);
  }
}
