export interface Encf {
  id: number;
  cantencf?: number; // Decimal(10,0)
  countencf?: number; // Decimal(10,0)
  alertaencf?: number; // Decimal(10,0)
  codempr?: string; // VarChar(6)
  desdeencf?: number; // Decimal(10,0)
  fechaencf: string; // Date (YYYY-MM-DD)
  hastaencf?: number; // Decimal(10,0)
  tipoencf?: string; // VarChar(4)
  empresacodempr?: { nom_empre?: string };
}

export class EncfModel implements Encf {
  id: number;
  cantencf?: number;
  countencf?: number;
  alertaencf?: number;
  codempr?: string;
  desdeencf?: number;
  fechaencf: string;
  hastaencf?: number;
  tipoencf?: string;
  empresacodempr?: { nom_empre?: string };

  constructor(init?: Partial<Encf>) {
    this.id = init?.id ?? 0;
    this.cantencf = init?.cantencf ?? 0;
    this.countencf = init?.countencf ?? 0;
    this.alertaencf = init?.alertaencf ?? 0;
    this.codempr = init?.codempr ?? '';
    this.desdeencf = init?.desdeencf ?? 0;
    this.fechaencf = init?.fechaencf ?? '';
    this.hastaencf = init?.hastaencf ?? 0;
    this.tipoencf = init?.tipoencf ?? '';
    this.empresacodempr = init?.empresacodempr ?? undefined;
  }
}