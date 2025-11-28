export interface EmpresaModel {
  status:  string;
  code:    number;
  message: string;
  data:    EmpresaModelData[];
}

export interface EmpresaModelData {
  cod_empre:    string;
  nom_empre:    string;
  dir_empre:    string;
  tel_empre:    string;
  rnc_empre:    string;
  letra_empre:  string;
  orden_compra: number;
  sucursales:   SucursalesData[];
}

export interface SucursalesData {
  cod_sucursal: number;
  nom_sucursal: string;
  cod_empre:    string;
  dir_sucursal: string;
  tel_sucursal: string;
}
