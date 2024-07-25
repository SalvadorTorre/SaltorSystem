export interface ModeloFactura{
  status: string;
  code: number;
  message: string;
  data: ModeloFacturaData[];
}

export interface ModeloFacturaData{
  codChofer: number;
  nomChofer: string;
  cedChofer: string;
  statusChofer: boolean,


}
