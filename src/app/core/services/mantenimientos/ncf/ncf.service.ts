import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";

@Injectable({
  providedIn: "root"
})
export class ServicioNcf {
  constructor(private http: HttpInvokeService) { }

  buscarTodosNcf(): Observable<any> {
    let url = `/tiposncf`;

    return this.http.GetRequest<any>(url);
  }
}
  
