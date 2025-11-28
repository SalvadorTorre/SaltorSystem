import { Injectable } from '@angular/core';
import { HttpInvokeService } from '../http-invoke.service'
import { Observable } from 'rxjs';
import { HttpParams, HttpResponse } from '@angular/common/http';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {


  constructor(private http: HttpInvokeService) {
  }


  login(loginData: any): Observable<any> {
    console.log(loginData);

    return this.http.PostRequest('api/profile/login', loginData);
  }


}
