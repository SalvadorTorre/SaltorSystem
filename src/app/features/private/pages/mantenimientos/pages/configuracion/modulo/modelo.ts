export interface Permiso {
  idpermiso?: number;
  descripcion?: string;
}

export interface Modulo {
  idmodulo: number;
  descmodulo?: string; // @db.VarChar(30)
  scceso?: string;     // @db.VarChar(1)  (S/N)
  lectura?: string;    // @db.VarChar(1)  (S/N)
  permisos?: Permiso[]; // relación uno a muchos
}

export class ModuloModel implements Modulo {
  idmodulo: number;
  descmodulo?: string;
  scceso?: string;
  lectura?: string;
  permisos?: Permiso[];

  constructor(init?: Partial<Modulo>) {
    this.idmodulo = init?.idmodulo ?? 0;
    this.descmodulo = init?.descmodulo ?? '';
    this.scceso = init?.scceso ?? 'N';
    this.lectura = init?.lectura ?? 'N';
    this.permisos = init?.permisos ?? [];
  }
}