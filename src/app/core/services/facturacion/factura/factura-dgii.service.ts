import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ServicioSalidafactura } from '../../almacen/salidafactura/salidafactura.service';
import { ServicioConfiguracionGlobal } from '../../mantenimientos/configuracion-global/configuracion-global.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { PrintingService } from '../../utils/printing.service';
import { ServicioFacturacion } from './factura.service';

@Injectable({ providedIn: 'root' })
export class FacturaDgiiService {
  constructor(
    private facturacion: ServicioFacturacion,
    private configuracion: ServicioConfiguracionGlobal,
    private salida: ServicioSalidafactura,
    private supabase: SupabaseService,
    private printing: PrintingService,
  ) {}

  async procesar(
    factura: any,
    progreso?: (mensaje: string) => void,
    opciones: { imprimir?: boolean } = {},
  ): Promise<any> {
    const codigo = String(factura?.fa_codFact || factura?.fa_codfact || '').trim();
    if (!codigo) throw new Error('La factura no tiene numero.');

    progreso?.('Validando y cargando la factura...');
    const facturaResp = await firstValueFrom(
      this.facturacion.getByNumero(codigo),
    );
    const encabezado = {
      ...factura,
      ...(facturaResp?.data || facturaResp || {}),
    };
    this.validar(encabezado);

    progreso?.('Reservando ENCF y cargando detalles...');
    const [encfResp, detalleResp] = await Promise.all([
      firstValueFrom(this.facturacion.asignarEncfFactura(codigo)),
      firstValueFrom(this.facturacion.buscarFacturaDetalle(codigo)),
    ]);
    const detalles = Array.isArray(detalleResp?.data) ? detalleResp.data : [];
    const completa = {
      ...encabezado,
      ...(encfResp?.data || {}),
    };
    if (!detalles.length) {
      throw new Error(`La factura ${codigo} no tiene detalles para enviar a DGII.`);
    }
    progreso?.('Guardando cobro e impresion...');
    const impresaResp: any = await firstValueFrom(
      this.facturacion.marcarFacturaComoImpresa({
        fa_codFact: codigo,
        fa_impresa: 'S',
        fa_fpago: completa.fa_fpago,
        fa_envio: completa.fa_envio,
        fa_codfpago: completa.fa_codfpago,
        fa_origenpago: completa.fa_origenpago,
        fa_confirpago: completa.fa_confirpago,
        fa_notapago: completa.fa_notapago,
      }),
    );
    const lista = { ...completa, ...(impresaResp?.data || {}) };

    try {
      await firstValueFrom(this.salida.sincronizarCobroFactura(codigo, lista));
    } catch (error) {
      console.warn('No se pudo sincronizar salida antes de DGII:', error);
    }

    progreso?.('Generando comprobante electronico...');
    const escenario = await this.construirEscenario(lista, detalles);
    const rnc = this.rnc(localStorage.getItem('rnc_empresa'));
    if (!rnc) throw new Error('No se encontro el RNC emisor activo.');

    let envioResp: any;
    try {
      envioResp = await firstValueFrom(
        this.configuracion.enviarDgiiDirectCert([escenario], rnc),
      );
    } catch (error: any) {
      const rawError = error?.dgiiResponse || error?.details || {
        message: error?.message || String(error),
      };
      const datosError = {
        ...this.normalizarRespuesta(rawError),
        dgii_request_json: escenario,
        dgii_response_raw: rawError,
        estado_envio_dgii: this.normalizarRespuesta(rawError)?.estado_envio_dgii || 'Error',
        estado_dgii: this.normalizarRespuesta(rawError)?.estado_dgii || 'Error',
      };
      try {
        await firstValueFrom(this.facturacion.actualizarDatosDgii(codigo, datosError));
      } catch (saveError) {
        console.warn('No se pudo guardar el error DGII en la factura:', saveError);
      }
      throw error;
    }
    const datosDgii = {
      ...this.normalizarRespuesta(envioResp?.data ?? envioResp),
      dgii_request_json: escenario,
      dgii_response_raw: envioResp?.data ?? envioResp,
      fa_status: 'F',
    };

    progreso?.('Guardando respuesta de DGII...');
    const actualizadaResp = await firstValueFrom(
      this.facturacion.actualizarDatosDgii(codigo, datosDgii),
    );
    const actualizada = {
      ...lista,
      ...(actualizadaResp?.data || {}),
      ...datosDgii,
      barcodeValue: codigo,
    };

    if (opciones.imprimir !== false) {
      progreso?.('Imprimiendo factura...');
      await this.printing.imprimirFactura80mm(actualizada, detalles);
    }
    return actualizada;
  }

  async reenviar(
    factura: any,
    progreso?: (mensaje: string) => void,
  ): Promise<any> {
    const codigo = String(factura?.fa_codFact || factura?.fa_codfact || '').trim();
    if (!codigo) throw new Error('La factura no tiene numero.');

    progreso?.('Cargando factura rechazada...');
    const [facturaResp, detalleResp] = await Promise.all([
      firstValueFrom(this.facturacion.getByNumero(codigo)),
      firstValueFrom(this.facturacion.buscarFacturaDetalle(codigo)),
    ]);
    const encabezado = {
      ...factura,
      ...(facturaResp?.data || facturaResp || {}),
    };
    this.validar(encabezado);

    const detalles = Array.isArray(detalleResp?.data) ? detalleResp.data : [];
    if (!detalles.length) {
      throw new Error(`La factura ${codigo} no tiene detalles para reenviar a DGII.`);
    }

    let completa = { ...encabezado };
    const encfActual = String(
      completa?.fa_ncfFact || completa?.fa_ncffact || '',
    ).trim();
    if (!encfActual) {
      progreso?.('Asignando ENCF antes del reenvio...');
      const encfResp = await firstValueFrom(this.facturacion.asignarEncfFactura(codigo));
      completa = {
        ...completa,
        ...(encfResp?.data || {}),
      };
    }

    progreso?.('Reconstruyendo comprobante electronico...');
    const escenario = await this.construirEscenario(completa, detalles);
    const rnc = this.rnc(localStorage.getItem('rnc_empresa'));
    if (!rnc) throw new Error('No se encontro el RNC emisor activo.');

    let envioResp: any;
    try {
      progreso?.('Reenviando factura a DGII...');
      envioResp = await firstValueFrom(
        this.configuracion.enviarDgiiDirectCert([escenario], rnc),
      );
    } catch (error: any) {
      const rawError = error?.dgiiResponse || error?.details || {
        message: error?.message || String(error),
      };
      const normalizada = this.normalizarRespuesta(rawError);
      const datosError = {
        ...normalizada,
        dgii_request_json: escenario,
        dgii_response_raw: rawError,
        estado_envio_dgii: normalizada?.estado_envio_dgii || 'Error',
        estado_dgii: normalizada?.estado_dgii || 'Error',
      };
      try {
        await firstValueFrom(this.facturacion.actualizarDatosDgii(codigo, datosError));
      } catch (saveError) {
        console.warn('No se pudo guardar el error DGII del reenvio:', saveError);
      }
      throw error;
    }

    const datosDgii = {
      ...this.normalizarRespuesta(envioResp?.data ?? envioResp),
      dgii_request_json: escenario,
      dgii_response_raw: envioResp?.data ?? envioResp,
      fa_status: 'F',
    };

    progreso?.('Guardando nueva respuesta de DGII...');
    const actualizadaResp = await firstValueFrom(
      this.facturacion.actualizarDatosDgii(codigo, datosDgii),
    );
    return {
      ...completa,
      ...(actualizadaResp?.data || {}),
      ...datosDgii,
      barcodeValue: codigo,
    };
  }

  private validar(factura: any): void {
    const envio = Number(factura?.fa_envio ?? 0) === 1;
    const tipo = String(factura?.fa_tipoNcf ?? factura?.fa_tiponcf ?? '').trim();
    const pago = String(factura?.fa_fpago ?? '').trim().toUpperCase();
    const pagada = pago === 'S' || pago === 'P';

    if (envio && tipo !== '32' && !pagada) {
      throw new Error(
        'Para enviar a DGII una factura de envio con tipo NCF diferente a 32 debe estar cobrada.',
      );
    }
  }

  private get db(): any {
    const client: any = this.supabase.client;
    if (!client) throw new Error('Supabase no esta configurado.');
    return typeof client.schema === 'function'
      ? client.schema(this.supabase.schema)
      : client;
  }

  private rnc(value: any): string {
    return String(value || '').trim().replace(/-/g, '');
  }

  private storageJson(value: string | null): any {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private fecha(input: any): string {
    const source = String(input || '').trim();
    if (!source) {
      const now = new Date();
      return `${String(now.getDate()).padStart(2, '0')}-${String(
        now.getMonth() + 1,
      ).padStart(2, '0')}-${now.getFullYear()}`;
    }
    const onlyDate = source.length >= 10 ? source.substring(0, 10) : source;
    const iso = onlyDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
    const dmy = onlyDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return dmy ? `${dmy[1]}-${dmy[2]}-${dmy[3]}` : onlyDate;
  }

  private redondear(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    const scaled = value * factor;
    const floor = Math.floor(scaled);
    const diff = scaled - floor;
    const epsilon = 1e-8;
    if (diff > 0.5 + epsilon) return (floor + 1) / factor;
    if (diff < 0.5 - epsilon) return floor / factor;
    return (floor % 2 === 0 ? floor : floor + 1) / factor;
  }

  private async vencimiento(codEmpresa: string, tipo: string): Promise<string> {
    const empresa = String(codEmpresa || '').trim().toUpperCase();
    if (!empresa || !tipo) return '';
    const { data, error } = await this.db
      .from('encf')
      .select('fechaencf,id')
      .eq('codempr', empresa)
      .eq('tipoencf', `E${tipo}`)
      .order('id', { ascending: false })
      .limit(1);
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : null;
    return row?.fechaencf ? this.fecha(row.fechaencf) : '';
  }

  private async construirEscenario(factura: any, items: any[]): Promise<any> {
    const encf = String(factura?.fa_ncfFact || factura?.fa_ncffact || '').trim();
    if (!encf) throw new Error('La factura no tiene ENCF.');
    const tipo = encf.startsWith('E') ? encf.substring(1, 3) : '';
    const rncEmisor = this.rnc(localStorage.getItem('rnc_empresa'));
    const nombreEmisor = String(localStorage.getItem('nombre_empresa') || '').trim();
    const direccion = String(
      localStorage.getItem('direccion_empresa') || '',
    ).trim();
    const codEmpresa = String(
      factura?.fa_codEmpr ||
        localStorage.getItem('cod_empre') ||
        localStorage.getItem('codigoempresa') ||
        '',
    )
      .trim()
      .toUpperCase();
    const sucursal = this.storageJson(localStorage.getItem('sucursal'));
    const nombreSucursal = String(
      sucursal?.nom_sucursal || sucursal?.descripcion || sucursal?.nombre || '',
    ).trim();
    const rncComprador = this.rnc(factura?.fa_rncFact);
    const nombreComprador = String(factura?.fa_nomClie || '').trim();
    const fechaVencimiento = await this.vencimiento(codEmpresa, tipo);
    const esRegimenEspecial = tipo === '44';

    if (!direccion) {
      throw new Error('La empresa no tiene Direccion del emisor para DGII.');
    }
    if (tipo === '31' && (!fechaVencimiento || !rncComprador || !nombreComprador)) {
      throw new Error(
        'La factura E31 requiere vencimiento de secuencia, RNC y nombre del comprador.',
      );
    }
    if (tipo === '44' && (!fechaVencimiento || !nombreComprador)) {
      throw new Error(
        'La factura E44 requiere vencimiento de secuencia y nombre del comprador.',
      );
    }

    const escenario: any = {
      Version: '1.0',
      TipoeCF: tipo,
      ENCF: encf,
    };
    if (fechaVencimiento) {
      escenario.FechaVencimientoSecuencia = fechaVencimiento;
    }
    if (!esRegimenEspecial) {
      escenario.IndicadorMontoGravado = '0';
    }
    escenario.TipoIngresos = '01';
    escenario.TipoPago = String(factura?.fa_codfpago || factura?.fa_fpago || '1');
    if (tipo === '31' && factura?.fa_expFact) {
      escenario.FechaLimitePago = this.fecha(factura.fa_expFact);
    }

    escenario.RNCEmisor = rncEmisor;
    escenario.RazonSocialEmisor = nombreEmisor;
    escenario.NombreComercial = nombreEmisor;
    if (nombreSucursal) escenario.Sucursal = nombreSucursal;
    escenario.DireccionEmisor = direccion;
    escenario.FechaEmision = this.fecha(factura?.fa_fecFact);
    if (rncComprador) escenario.RNCComprador = rncComprador;
    if (nombreComprador) escenario.RazonSocialComprador = nombreComprador;
    if (!esRegimenEspecial) {
      escenario.RegimenPagos = '0';
    }
    escenario.CasoPrueba = `${rncEmisor}${encf}`;

    const totalItem = (item: any): number =>
      Number(
        item?.total ??
          item?.df_valMerc ??
          item?.df_valmerc ??
          Number(item?.cantidad ?? item?.df_canMerc ?? 0) *
            Number(item?.precio ?? item?.df_preMerc ?? 0),
      ) || 0;
    const totalDetalle = items.reduce(
      (sum: number, item: any) => sum + totalItem(item),
      0,
    );
    let totalGravado = 0;
    let totalItbis = 0;
    let totalExento = 0;

    items.forEach((item: any, index: number) => {
      const linea = index + 1;
      const cantidad = Number(item?.cantidad ?? item?.df_canMerc ?? 0);
      const total = totalItem(item);
      const nombreItem = item?.producto?.in_desmerc || item?.df_desMerc || '';

      escenario[`NumeroLinea[${linea}]`] = linea;

      if (esRegimenEspecial) {
        const precioExento = cantidad > 0 ? total / cantidad : 0;
        const precioLinea = this.redondear(precioExento, 4);
        const montoLinea = this.redondear(precioLinea * cantidad, 2);
        totalExento += montoLinea;

        escenario[`IndicadorFacturacion[${linea}]`] = '4';
        escenario[`NombreItem[${linea}]`] = nombreItem;
        escenario[`IndicadorBienoServicio[${linea}]`] = '1';
        escenario[`CantidadItem[${linea}]`] = cantidad.toFixed(2);
        escenario[`PrecioUnitarioItem[${linea}]`] = precioLinea.toFixed(4);
        escenario[`MontoItem[${linea}]`] = montoLinea.toFixed(2);
        return;
      }

      const itbisGuardado = Number(
        item?.df_itbiMerc ?? item?.df_itbimerc ?? item?.itbis ?? 0,
      );
      const itbis =
        itbisGuardado ||
        (totalDetalle > 0 && Number(factura?.fa_itbiFact || 0) > 0
          ? Number(factura.fa_itbiFact) * (total / totalDetalle)
          : 0);
      const gravado = Math.max(0, total - itbis);
      const precio = cantidad > 0 ? gravado / cantidad : 0;
      const precioLinea = this.redondear(precio, 4);
      const gravadoLinea = this.redondear(precioLinea * cantidad, 2);
      const itbisLinea = this.redondear(total - gravadoLinea, 2);
      const tasa = gravadoLinea > 0 ? (itbisLinea / gravadoLinea) * 100 : 0;
      totalGravado += gravadoLinea;
      totalItbis += itbisLinea;

      escenario[`IndicadorFacturacion[${linea}]`] = '1';
      escenario[`NombreItem[${linea}]`] = nombreItem;
      escenario[`IndicadorBienoServicio[${linea}]`] = '1';
      escenario[`CantidadItem[${linea}]`] = cantidad.toFixed(2);
      escenario[`PrecioUnitarioItem[${linea}]`] = precioLinea.toFixed(4);
      escenario[`MontoItem[${linea}]`] = gravadoLinea.toFixed(2);
      escenario[`MontoITBIS[${linea}]`] = itbisLinea.toFixed(2);
      escenario[`TasaITBIS[${linea}]`] = tasa.toFixed(2);
    });

    const montoTotal = this.redondear(Number(factura?.fa_valFact || 0), 2);
    if (esRegimenEspecial) {
      escenario.MontoExento = this.redondear(totalExento || montoTotal, 2).toFixed(2);
      escenario.MontoTotal = montoTotal.toFixed(2);
      escenario['FormaPago[1]'] = String(
        factura?.fa_codfpago || factura?.fa_fpago || '1',
      );
      escenario['MontoPago[1]'] = montoTotal.toFixed(2);
      return escenario;
    }

    totalGravado = this.redondear(totalGravado, 2);
    totalItbis = this.redondear(totalItbis, 2);
    escenario.MontoExento = this.redondear(
      Math.max(0, montoTotal - totalGravado - totalItbis),
      2,
    ).toFixed(2);
    escenario.MontoGravadoTotal = totalGravado.toFixed(2);
    if (totalGravado > 0 && totalItbis > 0) {
      escenario.MontoGravadoI1 = totalGravado.toFixed(2);
      escenario.ITBIS1 = '18';
      escenario.TotalITBIS1 = totalItbis.toFixed(2);
    }
    escenario.TotalITBIS = totalItbis.toFixed(2);
    escenario.MontoTotal = montoTotal.toFixed(2);
    escenario['FormaPago[1]'] = String(
      factura?.fa_codfpago || factura?.fa_fpago || '1',
    );
    escenario['MontoPago[1]'] = montoTotal.toFixed(2);
    return escenario;
  }

  private normalizarRespuesta(raw: any): any {
    const pick = (...values: any[]): string | null => {
      for (const value of values) {
        const text = String(value ?? '').trim();
        if (text) return text;
      }
      return null;
    };
    const root = raw?.data && typeof raw.data === 'object' ? raw.data : raw;
    const payload = root?.data && typeof root.data === 'object' ? root.data : root;
    const first = Array.isArray(payload?.results) ? payload.results[0] : null;
    const nested = first || payload?.result || payload || {};
    const xmls = nested?.xmls || {};
    const rfce = nested?.rfceInfo || {};
    const ecf = nested?.ecfInfo || {};
    const responseXml = nested?.responseXML || {};
    const responseRfce = nested?.responseRFCE || {};
    const dgii = responseRfce?.dgiiResponse || responseXml?.dgiiResponse || {};
    const mensajes = this.extraerMensajesDgii(nested, payload, root, dgii);
    const errorMessage = pick(
      nested?.error,
      nested?.message,
      nested?.mensaje,
      payload?.error,
      payload?.message,
      payload?.mensaje,
      root?.error,
      root?.message,
      root?.mensaje,
      mensajes.join(' | '),
    );

    return {
      ...nested,
      estado_dgii: pick(
        nested?.estado_dgii,
        nested?.rfceEstado,
        nested?.estado,
        dgii?.estado,
        nested?.status,
      ),
      codseguridad: pick(
        nested?.codseguridad,
        nested?.codigoSeguridadeCF,
        nested?.codigoSeguridad,
        rfce?.codigoSeguridad,
        responseXml?.codigoSeguridad,
        ecf?.codigoSeguridad,
        dgii?.codigoSeguridad,
      ),
      qr_link: pick(
        nested?.qr_link,
        nested?.qrUrl,
        nested?.link_original,
        rfce?.link_original,
        responseXml?.qrUrl,
        ecf?.qrUrl,
        responseRfce?.qrUrl,
        dgii?.qrUrl,
      ),
      fec_firma: pick(
        nested?.fec_firma,
        nested?.fechaHoraFirmaRFCE,
        nested?.fechaHoraFirma,
        rfce?.fechaHoraFirma,
        responseXml?.fechaHoraFirma,
        ecf?.fechaHoraFirma,
      ),
      ecf: nested?.ecf ?? xmls?.ecf ?? null,
      rfce: nested?.rfce ?? xmls?.rfce ?? null,
      dgii_response_json: nested,
      dgii_mensajes: mensajes,
      dgii_error_message: errorMessage,
      dgii_track_id: pick(nested?.trackId, payload?.trackId, root?.trackId, dgii?.trackId),
      dgii_codigo: pick(nested?.codigo, payload?.codigo, root?.codigo, dgii?.codigo),
      estado_envio_dgii: pick(
        nested?.estado_envio_dgii,
        nested?.estadoEnvio,
        nested?.rfceEstado,
        dgii?.estado,
        nested?.status,
      ),
    };
  }

  private extraerMensajesDgii(...sources: any[]): string[] {
    const mensajes: string[] = [];
    const add = (value: any) => {
      if (value === null || value === undefined) return;
      if (Array.isArray(value)) {
        value.forEach(add);
        return;
      }
      if (typeof value === 'object') {
        add(value.mensaje || value.message || value.error || value.descripcion);
        return;
      }
      const text = String(value).trim();
      if (text && !mensajes.includes(text)) mensajes.push(text);
    };

    sources.forEach((source) => {
      if (!source || typeof source !== 'object') return;
      add(source.mensajes);
      add(source.mensaje);
      add(source.message);
      add(source.error);
      add(source.errors);
      add(source.detalles);
      add(source.details);
      add(source.observaciones);
    });

    return mensajes;
  }
}
