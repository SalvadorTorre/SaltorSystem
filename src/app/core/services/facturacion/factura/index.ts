export interface FacturacionModel {
  status: string;
  code: number;
  message: string;
  data: FacturacionModelData[];
}

export interface FacturacionModelData {
  fa_codFact: string;
  fa_fecFact: string;
  fa_valfact: number;
  fa_itbiFact: number;
  fa_codClie: string;
  fa_nomClie: string;
  fa_rncFact: number;
  fa_telClie: string;
  fa_dirClie: string;
  fa_correo: string;
  fa_codVend: string;
  fa_nomvend: string;
  fa_notaFact: string;
  fa_status: string;
  detFactura: detFacturaData[];
}

export interface detFacturaData {
  df_codFact: string;
  df_codMerc: string;
  df_desMerc: string;
  df_canMerc: number;
  df_preMerc: number;
  df_valMerc: number;
  df_unidad: string;
  df_cosMerc: number;
  df_codClie: string;
  df_status: string;
}
