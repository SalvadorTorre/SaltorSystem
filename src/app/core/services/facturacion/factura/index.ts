export interface FacturacionModel {
  status: string;
  code: number;
  message: string;
  data: FacturacionModelData[];
}

export interface FacturacionModelData {
  fa_codFact: string;
  fa_fecFact: string;
  fa_valFact: number;
  fa_cosFact: number;
  fa_itbiFact: number;
  fa_codClie: string;
  fa_nomClie: string;
  fa_rncFact: number;
  fa_telClie: string;
  fa_dirClie: string;
  fa_correo: string;
  fa_codVend: string;
  fa_nomVend: string;
  fa_notaFact: string;
  fa_status: string;
  fa_fehora: string;
  fa_expFact: string;
  fa_tipoFact: string;
  fa_subFact: string;
  fa_desFact: string;
  fa_aboFact: string;
  fa_fpago: string;
  fa_ncfFact: string;
  fa_fecNcf: string;
  fa_tipoNcf: string;
  fa_tipoRnc: string;
  fa_condFact: string;
  fa_contacto: string;
  fa_codZona: string;
  fa_sector: string;
  fa_desZona: string;
  fa_usuario: string;
  fa_notFact: string;
  fa_imp: string;
  fa_envio: string;
  fa_reimpresa: string;
  fa_fecha: string;
  fa_codEmpr: string;
  fa_codSucu: string;

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
  df_codEmpr: string;
  sf_codSucu: string;
}
