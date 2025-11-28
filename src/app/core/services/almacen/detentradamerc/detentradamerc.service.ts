import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { detEntradamercModel, detEntradamercModelData } from ".";

@Injectable({
    providedIn: "root"
})
export class ServiciodetEntradamerc {
    constructor(private http: HttpInvokeService) { }

    guardardetEntradamerc(detentradamerc: any): Observable<any> {
        return this.http.PostRequest<any, any>("/detentradamerc", detentradamerc);
    }

    editardetEntradamerc(de_codentra: string, detentradamerc: detEntradamercModel): Observable<any> {
        return this.http.PutRequest<any, any>(`/detentradamerc/${de_codentra}`, detentradamerc);
    }

    buscarTodasdetEntradamerc(pageIndex: number, pageSize: number, descripcion?: string): Observable<any> {
        let url = `/detentradamerc?page=${pageIndex}&limit=${pageSize}`;
        if (descripcion) {
            url += `&descripcion=${descripcion}`;
        }
        console.log(url);
        return this.http.GetRequest<any>(url);
    }

    eliminardetEntradamerc(de_codentra: string): Observable<any> {
        return this.http.DeleteRequest(`/detentradamerc/$de_codentra}`, "");
    }

    buscardetEmtradamerc(de_codentra: string): Observable<any> {
        return this.http.GetRequest<any>(`/detentradamerc/${de_codentra}`);
    }



}
