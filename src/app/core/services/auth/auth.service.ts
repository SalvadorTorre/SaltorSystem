import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { HttpInvokeService } from '../http-invoke.service';

interface LoginResponse {
  status: string;
  code: number;
  message: string;
  data: [
    usuario: any,
    token: "token",
    sucursal: any,
    empresa: any,
  ];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private loggedIn!: boolean;

  constructor(private http: HttpInvokeService) { }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('authToken');
  }

  login(loginData: any): Observable<LoginResponse> {
    return this.http
      .PostRequest<LoginResponse, any>('/usuario-login', loginData)
      .pipe(
        tap((response: any) => {
          console.log(response.data);
          if (response.status === "success" && response.data) {
            const userData = response;
            console.log(userData.data.sucursal);
            localStorage.setItem('authToken', userData.data.token);
            localStorage.setItem('username', userData.data.usuario.nombreUsuario);
            localStorage.setItem('sucursal', userData.data.sucursal);
            localStorage.setItem('empresa', userData.data.empresa);
            this.loggedIn = true;
          }
        }),
        catchError((error) => {
          this.loggedIn = false;
          return of(error);
        })
      );
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('sucursal');
    localStorage.removeItem('empresa');
    this.loggedIn = false;
    console.log(this.isLoggedIn());


  }



  getUsername(): string | null {
    return localStorage.getItem('username');
  }

  getName(): string | null {
    return localStorage.getItem('name');
  }

  getUserId(): string | null {
    return localStorage.getItem('userId');
  }
}
