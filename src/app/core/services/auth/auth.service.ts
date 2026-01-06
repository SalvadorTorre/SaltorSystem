import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { HttpInvokeService } from '../http-invoke.service';

interface LoginResponse {
  status: string;
  code: number;
  message: string;
  data: [usuario: any, token: 'token', sucursal: any, empresa: any];
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private loggedIn!: boolean;

  constructor(private http: HttpInvokeService) {}

  isLoggedIn(): boolean {
    return !!localStorage.getItem('authToken');
  }

  login(loginData: any): Observable<LoginResponse> {
    return this.http
      .PostRequest<LoginResponse, any>('/usuario-login', loginData)
      .pipe(
        tap((response: any) => {
          console.log(response.data);
          if (response.status === 'success' && response.data) {
            const userData = response;
            console.log(userData.data.sucursal);
            localStorage.setItem('authToken', userData.data.token);
            localStorage.setItem(
              'username',
              userData.data.usuario.nombreUsuario
            );

            // --- GUARDADO DE DATOS DE EMPRESA Y SUCURSAL ---
            // Guardamos los objetos completos para uso general
            localStorage.setItem(
              'sucursal',
              JSON.stringify(userData.data.sucursal)
            );
            localStorage.setItem(
              'empresa',
              JSON.stringify(userData.data.empresa)
            );

            // Guardamos datos específicos de la empresa para fácil acceso (impresión, headers, etc.)
            const emp = userData.data.empresa;
            if (emp && typeof emp === 'object') {
              localStorage.setItem('nombre_empresa', emp.nom_empre || '');
              localStorage.setItem('direccion_empresa', emp.dir_empre || '');
              localStorage.setItem('telefono_empresa', emp.tel_empre || '');
              localStorage.setItem('rnc_empresa', emp.rnc_empre || '');
              localStorage.setItem('cod_empre', emp.cod_empre || '');
              localStorage.setItem('letra_empre', emp.letra_empre || '');
              // Guardar logo u otros datos si vienen
              if (emp.logo) localStorage.setItem('logo_empresa', emp.logo);
            } else if (typeof emp === 'string') {
              // Fallback si el backend envía solo el nombre
              localStorage.setItem('nombre_empresa', emp);
            }

            localStorage.setItem(
              'codigousuario',
              userData.data.usuario.codUsuario
            );
            localStorage.setItem(
              'idSucursal',
              userData.data.usuario.sucursalid
            );
            localStorage.setItem(
              'codigoempresa',
              userData.data.usuario.cod_empre
            );

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
