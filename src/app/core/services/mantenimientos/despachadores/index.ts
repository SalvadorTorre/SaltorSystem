export interface ModeloDespachador{
  status: string;
  code: number;
  message: string;
  data: ModeloDespachadorData[];
}

export interface ModeloDespachadorData{
  CodDesp: number;
  nomDesp: string;
  tipoDesp: string;
  statusDespachadores: boolean,
  cedDesp: string;

}
