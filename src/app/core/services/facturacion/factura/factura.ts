
import { FacturacionModelData } from '.';
import { ModeloInventarioData } from "../../mantenimientos/inventario";

export interface FacturaDetalleModel {
  facturacion: FacturacionModelData;
  detalle: interfaceDetalleModel[];
  facturacionId:string;
}


export interface interfaceDetalleModel {
 total:number;
 cantidad:number;
 precio:number;
 costo: number; // <-- Agregar esta línea
 producto?: ModeloInventarioData;
 fecfactActual:Date;
}
