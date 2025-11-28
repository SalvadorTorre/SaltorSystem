export interface SucursalModel {
  status:  string;
  code:    number;
  message: string;
  data:    SucursalesData[];
}


export interface SucursalesData {
  cod_sucursal: number;
  nom_sucursal: string;
  cod_empre:    string;
  dir_sucursal: string;
  tel_sucursal: string;
}
