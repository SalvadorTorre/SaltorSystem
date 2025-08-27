export interface SalidafacturaModel {
  status: string;
  code: number;
  message: string;
  data: SalidafacturaModelData[];
}

export interface SalidafacturaModelData {
  codSalida: string;
  fecSalida: string;
  valSalida: number;
  horaSalida: string;
  nomChofer: string;
  codChofer: number;
  canFactura: number;
  valPagado: number;
  valDevolucion: number;
  cedChofer: string;
  status: string;
  envia: string;
  preparado: string;


  detSalidafactura: detSalidafacturaData[];
}

export interface detSalidafacturaData {
  codsalida: string;
  codFact: string;
  fecFact: string;
  valFact: number;
  valAbono: number;
  devolucion: string;
  valDevolucion: number;
  entregada: string;
  pagado: string;
  status: string;
  imp: string;
  codChofer: number;
  nomChofer: string;
}
