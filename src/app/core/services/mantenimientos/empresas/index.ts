export interface ModeloEmpresa{
    pagination: any;
    status: string;
    code: number;
    message: string;
    data: ModeloEmpresaData[];
  }
  
  export interface ModeloEmpresaData{
  
    cod_empre: number;
    nom_empre: string;
    dir_empre: string;
    rnc_empre: number;
    tel_empre: number;
    letra_empre: string;
    orden_compra: number;
  }
  