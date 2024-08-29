import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { detCotizacionModel, detCotizacionData } from ".";

@Injectable({
    providedIn: "root"
})
export class ServiciodetCotizacion {
    constructor(private http: HttpInvokeService) { }

    guardardetCotizacion(detcotizacion: any): Observable<any> {
        return this.http.PostRequest<any, any>("/detcotizacion", detcotizacion);
    }

    editardetCotizacion(dc_codcoti: string, detcotizacion: detCotizacionModel): Observable<any> {
        return this.http.PutRequest<any, any>(`/detcotizacion/${dc_codcoti}`, detcotizacion);
    }

    buscarTodasdetCotizacion(pageIndex: number, pageSize: number, descripcion?: string): Observable<any> {
        let url = `/cotizacion?page=${pageIndex}&limit=${pageSize}`;
        if (descripcion) {
            url += `&descripcion=${descripcion}`;
        }
        console.log(url);
        return this.http.GetRequest<any>(url);
    }

    eliminardetCotizacion(dc_codcoti: string): Observable<any> {
        return this.http.DeleteRequest(`/detcotizacion/${dc_codcoti}`, "");
    }

    buscardetCotizacion(dc_codcoti: string): Observable<any> {
        return this.http.GetRequest<any>(`/detcotizacion/${dc_codcoti}`);
    }



}
