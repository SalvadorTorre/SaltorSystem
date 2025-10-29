export interface Permiso {
  idpermiso: number;
  idusuario?: string; // @db.VarChar(10)
  idmodulo?: number;
  acceso?: string;    // @db.VarChar(1) S/N
  lectura?: string;   // @db.VarChar(1) S/N
}

export class PermisoModel implements Permiso {
  idpermiso: number;
  idusuario?: string;
  idmodulo?: number;
  acceso?: string;
  lectura?: string;

  constructor(init?: Partial<Permiso>) {
    this.idpermiso = init?.idpermiso ?? 0;
    this.idusuario = init?.idusuario ?? '';
    this.idmodulo = init?.idmodulo ?? undefined;
    this.acceso = init?.acceso ?? 'N';
    this.lectura = init?.lectura ?? 'N';
  }
}