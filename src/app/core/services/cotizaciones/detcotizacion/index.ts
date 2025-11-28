export interface detCotizacionModel {
  status:  string;
  code:    number;
  message: string;
  data:    detCotizacionData[];
}


export interface detCotizacionData {
    dc_codcoti: string;
    dc_codmerc: string;
    dc_descrip: string;
    dc_canmerc: number;
    dc_premerc: number;
    dc_valmerc: number;
    dc_unidad: string;
    dc_costmer: number;
    dc_codclie: string;
    dc_status: string;
}
