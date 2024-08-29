import { CotizacionModelData } from ".";
import { ModeloInventarioData } from "../../mantenimientos/inventario";

export interface CotizacionDetalleModel {
  cotizacion: CotizacionModelData;
  detalle: interfaceDetalleModel[];
  cotizacionId:string;
}

export interface interfaceDetalleModel {
 total:number;
 cantidad:number;
 precio:number;
 producto?: ModeloInventarioData;
}
