export interface ModeloCliente{
  status: string;
  code: number;
  message: string;
  data: ModeloClienteData[];
}

export interface ModeloClienteData{

  cl_codClie: any;
  cl_nomClie: string;
  cl_dirClie: string;
  cl_codSect: number;
  cl_codZona: number;
  cl_telClie: string;
  cl_tipo: string;
  cl_status: boolean;
  cl_rnc: number;
}
