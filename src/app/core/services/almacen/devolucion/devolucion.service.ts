import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { HttpInvokeService } from "../../http-invoke.service";

@Injectable({
  providedIn: 'root'
})
export class DevolucionService {
    constructor(private http: HttpInvokeService) { }

//   private apiUrl = 'http://localhost:3000/api/devolucion-completa';

//   constructor(private http: HttpClient) {}
     

   guardarDevolucion(payload: any) {
     return this.http.PostRequest<any, any>("/devolucion-completa", payload);

    // return this.http.post(this.apiUrl, payload);
  }
}