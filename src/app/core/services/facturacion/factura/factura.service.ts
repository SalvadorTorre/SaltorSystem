import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { HttpInvokeService } from '../../http-invoke.service';
import { HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';
@Injectable({
  providedIn: 'root',
})
export class ServicioFacturacion {
  private baseUrl = '/api'; // Ajusta la URL base según sea necesario
  constructor(private http: HttpInvokeService) {}

  getByNumero(numero: string): Observable<any> {
    return this.http.GetRequest<any>(`/factura-numero/${numero}`);
  }

  // marcarImpresa(numero: string, body: { fa_envio?: string; fa_fpago?: string }) {
  //   return this.http.PatchRequest(`/factura-impresa/${numero}`, body);
  // }
  marcarImpresa(
    numero: string,
    body: { fa_envio?: string; fa_fpago?: string }
  ) {
    console.log('📤 Enviando PATCH a backend:', numero, body);
    return this.http.PatchRequest(`/factura-impresa/${numero}`, body);
  }

  guardarFacturacion(datosParaGuardar: any): Observable<any> {
    return this.http.PostRequest<any, any>('/facturacion', datosParaGuardar);
  }

  obtenerFacturasNoImpresas(): Observable<any> {
    const endpoint = '/facturas-no-impresas';
    const params = new HttpParams(); // Si no vas a enviar parámetros, pon uno vacío
    return this.http.get(endpoint, params);
  }

  marcarFacturaComoImpresa(payload: any) {
    const cod = payload.fa_codFact;
    return this.http.PatchRequest(`/factura-impresa/${cod}`, payload);
  }

  editarFacturacion(payload: any) {
    const cod = payload.factura.fa_codFact;
    return this.http.PutRequest(`/facturacion/${cod}`, payload);
  }

  actualizarSalidaFactura(codFact: string, payload: { fa_salida: string; idsalida: number }) {
    return this.http.PatchRequest(`/facturacion/actualizar-salida/${codFact}`, payload);
  }

  actualizarPagoYEntrega(facturas: any[]): Observable<any> {
    return this.http.PatchRequest('/facturacion/actualizar-pago-entrega', { facturas });
  }

  buscarTodasFacturacion(): Observable<any> {
    let url = `/facturacion`;
    console.log('FACTURA', url);
    return this.http.GetRequest<any>(url);
  }

  buscarFacturasParaCierre(limit: number = 10000): Observable<any> {
    let url = `/facturacion?limit=${limit}`;
    console.log('FACTURA CIERRE', url);
    return this.http.GetRequest<any>(url);
  }

  eliminarFacturacion(fa_codFact: string): Observable<any> {
    return this.http.DeleteRequest(`/eliminar-facturacion/${fa_codFact}`, '');
  }

  buscarFacturacionPorNombre(
    currentPage: number,
    pageSize: number,
    fa_nomClie: string
  ): Observable<any> {
    return this.http.GetRequest<any>(`/facturacion/${fa_nomClie}`);
  }
  buscarFacturaDetalle(df_codFact: string): Observable<any> {
    return this.http.GetRequest<any>(`/detalle-factura/${df_codFact}`);
  }
  buscarFacturaDetallePendiente(df_codFact: string): Observable<any> {
    return this.http.GetRequest<any>(`/facturacion-detpendiente/${df_codFact}`);
  }
  actutalizarPendienteNuevo(fa_codFact: string) {
    return this.http.PutRequest(`/crea-pendiente/${fa_codFact}`, '');
  }
  actutalizarPendienteModficado(
    fa_codFact: string,
    accion: 'poner' | 'quitar'
  ) {
    return this.http.PatchRequest(`/actualiza-pendiente/${fa_codFact}`, {
      accion,
    });
  }
  acturalizaDetPendiente(payload: any) {
    const cod = payload.factura.df_codFact;
    return this.http.PutRequest(`/actualiza-detpendiente/${cod}`, payload);
  }
  buscarFacturacion(
    pageIndex: number,
    pageSize: number,
    codigo?: string,
    nomcliente?: string,
    fecha?: string
  ): Observable<any> {
    let url = `/facturacion-numero?page=${pageIndex}&limit=${pageSize}`;

    if (codigo) {
      url += `&codigo=${codigo}`;
    }
    if (nomcliente) {
      url += `&nomcliente=${nomcliente}`;
    }
    if (fecha) {
      url += `&fecha=${fecha}`;
    }
    return this.http.GetRequest<any>(url);
  }

  buscarFacturacionPendiente(
    pageIndex: number,
    pageSize: number
  ): Observable<any> {
    let url = `/facturacion/pendientes?page=${pageIndex}&limit=${pageSize}`;
    return this.http.GetRequest<any>(url);
  }

  buscarFacturasPendientesDgii(): Observable<any> {
    return this.http.GetRequest<any>('/facturacion/pendientes-dgii');
  }

  actualizarDatosDgii(fa_codFact: string, payload: any): Observable<any> {
    return this.http.PatchRequest(
      `/facturacion/actualizar-datos-dgii/${fa_codFact}`,
      payload
    );
  }

  actualizarEntregaFactura(codFact: string, fa_entrega: string): Observable<any> {
    return this.http.PatchRequest(`/facturacion/actualizar-entrega/${codFact}`, { fa_entrega });
  }

  confirmarCierreFacturas(): Observable<any> {
    return this.http.PatchRequest('/facturacion/confirmar-cierre', {});
  }
}
