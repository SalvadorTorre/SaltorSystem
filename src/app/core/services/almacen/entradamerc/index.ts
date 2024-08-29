export interface EntradamercModel {
    status: string;
    code: number;
    message: string;
    data: EntradamercModelData[];
}

export interface EntradamercModelData {
    em_codentra: string;
    em_feccentra: string;
    em_valentra: number;
    em_codsupl: string;
    em_nomsup: string;
    em_rnc: number;
    em_telsupl: string;
    em_dirsupl: string;
    em_codvend: string;
    em_nomvend: string;
    em_nota: string;
    em_status: string;
    detemtradamerc: detEntradamercData[];
}

export interface detEntradamercData {
    dm_codentra: string;
    de_codmerc: string;
    de_descrip: string;
    de_canmerc: number;
    de_premerc: number;
    de_valmerc: number;
    de_unidad: string;
    dc_status: string;
}
