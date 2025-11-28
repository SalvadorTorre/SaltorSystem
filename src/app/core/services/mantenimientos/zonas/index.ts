export interface ModeloZona{
  status: string;
  code: number;
  message: string;
  data: ModeloZonaData[];
}

export interface ModeloZonaData{
  zo_codZona: number;
  zo_descrip: string;

}
