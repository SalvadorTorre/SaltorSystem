export interface SolicitudPrestamoData {
  so_codsoli: string;
  so_numero?: string;
  so_fecha: string;
  so_codclie: string;
  so_nomclie: string;
  so_codsucuclie?: number | string;
  so_sucursal_clie?: string;
  so_nomvend?: string;
  so_solicitante?: string;
  so_observacion?: string;
  so_status?: string;
  so_codempr?: string;
  so_codsucu?: number;
  detsolicitud?: DetSolicitudPrestamoData[];
}

export interface DetSolicitudPrestamoData {
  id?: number;
  ds_codsoli: string;
  ds_numero?: string;
  ds_codmerc: string;
  ds_desmerc: string;
  ds_canmerc: number;
  ds_unidad?: string;
}
