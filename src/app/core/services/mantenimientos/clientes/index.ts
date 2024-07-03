export interface ModeloCliente{
  data: ModeloCliente[];
  cl_codClie: number;
  cl_nomClie: string;
  cl_dirClie: string;
  cl_codSect: number;
  cl_codZona: number;
  cl_telClie: string;
  cl_tipo: string;
  cl_status: boolean;
  cl_rnc: number;
}
export interface ModeloClienteData{
  zo_codZona: number;
  zo_descrip: string;
  cl_codClie: number;
  cl_nomClie: string;
  cl_dirClie: string;
  cl_codSect: number;
  cl_codZona: number;
  cl_telClie: string;
  cl_tipo: string;
  cl_status: boolean;
  cl_rnc: number;
}
