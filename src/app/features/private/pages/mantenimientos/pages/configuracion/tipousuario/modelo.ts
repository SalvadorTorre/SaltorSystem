export interface Tipousuario {
  id: number;
  descripcion?: string;
  dtipousuarios?: Dtipousuario[];
}

export interface Dtipousuario {
  id: number;
  idtipousuario?: number;
  idmodulo?: number;
  lectura?: string; // S/N
  acceso?: string;  // S/N
}

export class TipousuarioModel implements Tipousuario {
  id: number;
  descripcion?: string;
  dtipousuarios?: Dtipousuario[];
  constructor(init?: Partial<Tipousuario>) {
    this.id = init?.id ?? 0;
    this.descripcion = init?.descripcion ?? '';
    this.dtipousuarios = init?.dtipousuarios ?? [];
  }
}

export class DtipousuarioModel implements Dtipousuario {
  id: number;
  idtipousuario?: number;
  idmodulo?: number;
  lectura?: string;
  acceso?: string;
  constructor(init?: Partial<Dtipousuario>) {
    this.id = init?.id ?? 0;
    this.idtipousuario = init?.idtipousuario ?? undefined;
    this.idmodulo = init?.idmodulo ?? undefined;
    this.lectura = init?.lectura ?? 'N';
    this.acceso = init?.acceso ?? 'N';
  }
}