import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { detVentainternaModel, detVentainternaData } from ".";

@Injectable({
    providedIn: "root"
})
export class ServiciodetVentainterna {
    constructor(private http: HttpInvokeService) { }

    guardardetVentainterna(detventainterna: any): Observable<any> {
        return this.http.PostRequest<any, any>("/detventainterna", detventainterna);
    }

    editardetVentainterna(df_codFact: string, detventainterna: detVentainternaModel): Observable<any> {
        return this.http.PutRequest<any, any>(`/detventainterna/${df_codFact}`, detventainterna);
    }

    buscarTodasdetVentainterna(pageIndex: number, pageSize: number, descripcion?: string): Observable<any> {
        let url = `/ventainterna?page=${pageIndex}&limit=${pageSize}`;
        if (descripcion) {
            url += `&descripcion=${descripcion}`;
        }
        console.log(url);
        return this.http.GetRequest<any>(url);
    }

    eliminardetVentainterna(df_codFact: string): Observable<any> {
        return this.http.DeleteRequest(`/detventainterna/${df_codFact}`, "");
    }

    buscardetVentainterna(df_codFact: string): Observable<any> {
        return this.http.GetRequest<any>(`/detventainterna/${df_codFact}`);
    }



}
