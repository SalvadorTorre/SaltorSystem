export interface ModeloFpago{
  fp_descfpago: string;
  status: string;
  code: number;
  message: string;
  data: ModeloFpagoData[];
}

export interface ModeloFpagoData{
  fp_codfpago: number;
  fp_descfpago: string;
  dgii_codigo?: number;
  es_dgii?: boolean;
  activo?: boolean;

}
