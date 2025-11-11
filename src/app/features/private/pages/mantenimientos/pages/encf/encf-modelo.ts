export interface Encf {
  id: number;
  codsucu?: string; // VarChar(5)
  cantencf?: number; // Decimal(10,0)
  countencf?: number; // Decimal(10,0)
  alertaencf?: number; // Decimal(10,0)
  codempr?: string; // VarChar(6)
  desdeencf?: number; // Decimal(10,0)
  fechaencf: string; // Date (YYYY-MM-DD)
  hastaencf?: number; // Decimal(10,0)
  tipoencf?: string; // VarChar(1)
}

export class EncfModel implements Encf {
  id: number;
  codsucu?: string;
  cantencf?: number;
  countencf?: number;
  alertaencf?: number;
  codempr?: string;
  desdeencf?: number;
  fechaencf: string;
  hastaencf?: number;
  tipoencf?: string;

  constructor(init?: Partial<Encf>) {
    this.id = init?.id ?? 0;
    this.codsucu = init?.codsucu ?? '';
    this.cantencf = init?.cantencf ?? 0;
    this.countencf = init?.countencf ?? 0;
    this.alertaencf = init?.alertaencf ?? 0;
    this.codempr = init?.codempr ?? '';
    this.desdeencf = init?.desdeencf ?? 0;
    this.fechaencf = init?.fechaencf ?? '';
    this.hastaencf = init?.hastaencf ?? 0;
    this.tipoencf = init?.tipoencf ?? '';
  }
}