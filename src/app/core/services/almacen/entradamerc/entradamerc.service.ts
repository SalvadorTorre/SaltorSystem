import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";
import { EntradamercModel, EntradamercModelData } from ".";

@Injectable({
    providedIn: "root"
})
export class ServicioEntradamerc {
    constructor(private http: HttpInvokeService) { }

    guardarEntradamerc(entradamerc: any): Observable<any> {
        return this.http.PostRequest<any, any>("/entradamerc", entradamerc);
    }

    editarEntradamerc(me_codentra: string, entradamerc: EntradamercModel): Observable<any> {
        return this.http.PutRequest<any, any>(`/entradamerc/${me_codentra}`, entradamerc);
    }

    buscarTodasEntradamerc(pageIndex: number, pageSize: number, descripcion?: string): Observable<any> {
        let url = `/entradamerc?page=${pageIndex}&limit=${pageSize}`;
        if (descripcion) {
            url += `&descripcion=${descripcion}`;
        }
        console.log(url);
        return this.http.GetRequest<any>(url);
    }

    eliminarEntradamerc(me_codentra: string): Observable<any> {
        return this.http.DeleteRequest(`/entradamerc/$me_codentra}`, "");
    }

    buscarEmtradamerc(me_codentra: string): Observable<any> {
        return this.http.GetRequest<any>(`/entradamerc/${me_codentra}`);
    }



}
