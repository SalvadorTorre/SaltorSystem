export interface EntradamercModel {
    status: string;
    code: number;
    message: string;
    data: EntradamercModelData[];
}

export interface EntradamercModelData {
    me_codentr: string;
    me_feccentr: string;
    me_valentr: number;
    me_codsupl: string;
    me_nomsup: string;
    me_rnc: number;
    me_telsupl: string;
    me_dirsupl: string;
    me_codvend: string;
    me_nomvend: string;
    me_nota: string;
    me_status: string;
    detemtradamerc: detEntradamercData[];
}

export interface detEntradamercData {
    de_codentr: string;
    de_codmerc: string;
    de_descrip: string;
    de_canmerc: number;
    de_premerc: number;
    de_valmerc: number;
    de_unidad: string;
    dc_status: string;
}
