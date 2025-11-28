export interface ModeloChofer{
  status: string;
  code: number;
  message: string;
  data: ModeloChoferData[];
}

export interface ModeloChoferData{
  codChofer: number;
  nomChofer: string;
  cedChofer: string;
  statusChofer: boolean,

}
