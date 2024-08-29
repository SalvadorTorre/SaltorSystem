export interface detEntradamercModel {
    status: string;
    code: number;
    message: string;
    data: detEntradamercModelData[];
}


}

export interface detEntradamercModelData {
    dm_codentra: string;
    de_codmerc: string;
    de_descrip: string;
    de_canmerc: number;
    de_premerc: number;
    de_valmerc: number;
    de_unidad: string;
    dc_status: string;
}
