// import { Injectable } from "@angular/core";
// import { Observable } from "rxjs";
// import { HttpClient } from "@angular/common/http";
// import { Despachador } from "src/app/core/services/mantenimientos/despachadores/Despacho.model";


// @Injectable({
//   providedIn: "root"
// })
// export class ServicioDespacho {
//   private baseUrl = "http://localhost:3000/api/despachadores";

//   constructor(private http: HttpClient) { }

//   buscarPorCedula(cedula: string): Observable<Despachador | null> {
//     return this.http.get<Despachador | null>(`${this.baseUrl}/cedula/${cedula}`);
//   }
// }
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Despachador } from "src/app/core/services/mantenimientos/despachadores/Despacho.model";


@Injectable({
  providedIn: 'root'
})
export class DespachoService {
  private baseUrl = 'http://localhost:3000/api/despachador'; // 🔹 Ajusta tu backend

  constructor(private http: HttpClient) { }

  buscarPorCedula(cedula: string): Observable<Despachador | null> {
    return this.http.get<Despachador | null>(`${this.baseUrl}/${cedula}`);
  }
}
