import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpInvokeService } from "../../http-invoke.service";

@Injectable({
  providedIn: "root"
})
export class ServicioContFactura {
  constructor(private http: HttpInvokeService) {}

  // Lista con paginación y filtro por sucursal
  buscarTodos(pageIndex: number, pageSize: number, sucursal?: string | number): Observable<any> {
    let url = `/contfactura?page=${pageIndex}&limit=${pageSize}`;
    if (sucursal !== undefined && sucursal !== null && String(sucursal).length > 0) {
      url += `&sucursal=${sucursal}`;
    }
    return this.http.GetRequest<any>(url);
  }

  buscarPorSucursal(sucursal: number): Observable<any> {
    return this.buscarTodos(1, 1, sucursal);
  }

  // Lista simple
  obtenerTodos(): Observable<any> {
    return this.http.GetRequest<any>(`/contfactura`);
  }

  // Detalle por id
  buscarPorId(id: number): Observable<any> {
    return this.http.GetRequest<any>(`/contfactura/${id}`);
  }

  // Crear
  guardarContFactura(payload: any): Observable<any> {
    return this.http.PostRequest<any, any>(`/contfactura`, payload);
  }

  // Editar
  editarContFactura(id: number, payload: any): Observable<any> {
    return this.http.PutRequest<any, any>(`/contfactura/${id}`, payload);
  }

  // Eliminar
  eliminarContFactura(id: number): Observable<any> {
    return this.http.DeleteRequest(`/contfactura/${id}`, "");
  }
}