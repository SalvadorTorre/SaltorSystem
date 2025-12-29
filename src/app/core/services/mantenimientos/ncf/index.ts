export interface ModeloNcf{
    status: string;
    code: number;
    message: string;
    data: ModeloNcfData[];
  }

  export interface ModeloNcfData{
    codNcf:    number;
    desNcf:     string;
    tipo:     string;
}
