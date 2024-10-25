export interface ModeloFpago{
  status: string;
  code: number;
  message: string;
  data: ModeloFpagoData[];
}

export interface ModeloFpagoData{
  fp_codfpago: number;
  fp_descfpago: string;

}
