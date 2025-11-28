export interface CotizacionModel {
    status: string;
    code: number;
    message: string;
    data: CotizacionModelData[];
}

export interface CotizacionModelData {
    ct_codcoti: string;
    ct_feccoti: string;
    ct_valcoti: number;
    ct_itbis: number;
    ct_codclie: string;
    ct_nomclie: string;
    ct_rnc: number;
    ct_telclie: string;
    ct_dirclie: string;
    ct_correo: string;
    ct_codvend: string;
    ct_nomvend: string;
    ct_nota: string;
    ct_status: string;
    detCotizacion: detCotizacionData[];
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
