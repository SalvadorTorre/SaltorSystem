export interface VentainternaModel {
  status: string;
  code: number;
  message: string;
  data: VentainternaModelData[];
}

export interface VentainternaModelData {
  fa_codFact: string;
  fa_fecFact: string;
  fa_valFact: number;
  fa_codClie: string;
  fa_nomClie: string;
  fa_codVend: string;
  fa_nomVend: string;
  fa_solicitud:string;
  detVentainterna: detVentainternaData[];
}

export interface detVentainternaData {
  df_codFact: string;
  df_codMerc: string;
  df_desMerc: string;
  df_canMerc: number;
  df_preMerc: number;
  df_valMerc: number;
  df_unidad: string;
  df_cosMerc: number;
  df_codClie: string;
}
