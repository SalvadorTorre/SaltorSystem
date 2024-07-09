export interface ModeloSector{
  status: string;
  code: number;
  message: string;
  data: ModeloSectorData[];
}

export interface ModeloSectorData{
  se_codSect: number;
  se_desSect: string;

}
