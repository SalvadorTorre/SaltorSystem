import { VentainternaModelData } from '.';
import { ModeloInventarioData } from '../../mantenimientos/inventario';

export interface VentainternaDetalleModel {
  ventainterna: VentainternaModelData;
  detalle: interfaceDetalleModel[];
  ventainternaId: string;
}

export interface interfaceDetalleModel {
  total: number;
  cantidad: number;
  precio: number;
  producto?: ModeloInventarioData;
}
