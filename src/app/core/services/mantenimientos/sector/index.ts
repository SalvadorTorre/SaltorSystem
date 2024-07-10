export interface ModeloSecotSector{
  status: string;
  code: number;
  message: string;
  data: ModeloSectorData[];
}

export interface ModeloSectorData{
  zo_codZona: number;
  zo_descrip: string;

}
