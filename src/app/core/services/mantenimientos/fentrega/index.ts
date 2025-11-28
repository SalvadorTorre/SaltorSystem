export interface ModeloFentrega {
  status: string;
  code: number;
  message: string;
  data: ModeloFentregaData[];
}

export interface ModeloFentregaData {
  idfentrega: number;
  desentrega: string;
}