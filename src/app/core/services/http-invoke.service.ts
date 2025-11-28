import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
providedIn: 'root'
})
export class HttpInvokeService {
private backendUrl: string;
private handleError: boolean = false;

public constructor(private http: HttpClient) {
this.backendUrl = environment.backendUrl;
}






get(endpoint: string, params: HttpParams): Observable<any> {
const url = `${this.backendUrl}${endpoint}`;
return this.http.get(url, { params: params });
}



PutRequest = <TResult, TSource>(request: string, body: TSource, handleError: boolean = true): Observable<TResult> => {
this.handleError = handleError;
return this.filterRequest(this.http.put(`${this.backendUrl}${request}`, body));
};
PatchRequest = <TResult, TSource>(request: string, body: TSource, handleError: boolean = true): Observable<TResult> => {
this.handleError = handleError;
return this.filterRequest(this.http.patch(`${this.backendUrl}${request}`, body));
};
UpdateRequest = <TResult, TSource>(request: string, body: TSource, handleError: boolean = true): Observable<TResult> => {
this.handleError = handleError;
return this.filterRequest(this.http.put(`${this.backendUrl}${request}`, body));
};
DeleteRequest = <TResult, TSource>(request: string, body: TSource, handleError: boolean = true): Observable<TResult> => {
this.handleError = handleError;
return this.filterRequest(this.http.delete(`${this.backendUrl}${request}`, { body }));
};
GetRequest = <TResult>(request: string, handleError: boolean = true): Observable<TResult> => {
this.handleError = handleError;
return this.filterRequest(this.http.get(`${this.backendUrl}${request}`));
};
PostRequest = <TResult, TSource>(request: string, body: TSource, handleError: boolean = true): Observable<TResult> => {
this.handleError = handleError;
return this.filterRequest(this.http.post(`${this.backendUrl}${request}`, body));
};
private filterRequest = <TResult>(obs: Observable<Object>): Observable<TResult> =>
obs
.pipe(catchError((errorResponse: HttpErrorResponse): Promise<any> => {
if (errorResponse.error instanceof ErrorEvent) {
// A client-side or network error occurred. Handle it accordingly.
console.error('An error occurred:', errorResponse.error.message);
} else {
switch (errorResponse.status) {
case 0:
alert('There is no connection to the server, check your internet connection.');
break;
case 401:
break;
case 403:
this.handleError && alert(errorResponse.error);
break;
case 404:
this.handleError && alert(errorResponse.error);
break;
default:
console.log(
`Backend returned code ${errorResponse.status}, ` +
`body was: ${errorResponse.error}`);
alert('We are currently unable to complete your request. Please try again later.');
break;
}
}
return Promise.reject(errorResponse);
}));

}
