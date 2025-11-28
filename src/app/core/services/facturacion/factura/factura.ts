
import { FacturacionModelData } from '.';
import { ModeloInventarioData } from "../../mantenimientos/inventario";

export interface FacturaDetalleModel {
  facturacion: FacturacionModelData;
  detalle: interfaceDetalleModel[];
  facturacionId: string;
}


export interface interfaceDetalleModel {
  total: number;
  cantidad: number;
  precio: number;
  costo: number; // <-- Agregar esta línea
  producto?: ModeloInventarioData;
  fecfactActual: Date;
  fa_codFact?: string;
  fa_fecFact?: string;
  fa_nomClie?: string;
  fa_valFact?: number;
  fa_impresa?: 'S' | 'N';
  fa_envio?: string;
  fa_fpago?: string;
  df_canpend?: number;
  df_pendiente?:string
}
