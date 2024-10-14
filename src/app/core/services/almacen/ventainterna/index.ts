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
  detVentainterna: detVentainternaData[];
}

export interface detVentainternaData {
  dc_codFact: string;
  fa_codMerc: string;
  fa_desMerc: string;
  fa_canMerc: number;
  fa_preMerc: number;
  fa_valMerc: number;
  fa_unidad: string;
  fa_cosMerc: number;
  fa_codClie: string;
}
