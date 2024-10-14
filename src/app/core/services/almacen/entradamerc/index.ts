export interface EntradamercModel {
    status: string;
    code: number;
    message: string;
    data: EntradamercModelData[];
}

export interface EntradamercModelData {
    me_codEntr: string;
    me_fecEntr: string;
    me_valEntr: number;
    me_codSupl: string;
    me_nomSupl: string;
    me_rncSupl: number;
    me_facSupl: number;
    me_fecSupl: string;
    me_telSupl: string;
    me_dirSupl: string;
    me_codVend: string;
    me_nomVend: string;
    me_nota: string;
    me_status: string;
    me_chofer: string;
    me_vendedor: string;
    me_despachado: string;

    detemtradamerc: detEntradamercData[];
}

export interface detEntradamercData {
    de_codEntr: string;
    de_codMerc: string;
    de_desMerc: string;
    de_canEntr: number;
    de_preMerc: number;
    de_valMerc: number;
    de_unidad: string;
    de_status: string;
    de_fecEntr: string;
}
