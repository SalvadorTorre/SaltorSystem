export interface ModeloFpago{
  status: string;
  code: number;
  message: string;
  data: ModeloFpagoData[];
}

export interface ModeloFpagoData{
  se_codSect: number;
  se_desSect: string;
  se_codZona: number;

}
