export interface Permiso {
  idpermiso: number;
  codusuario?: number; // referencia a Usuario.codUsuario (Int)
  idmodulo?: number;
  acceso?: string;    // @db.VarChar(1) S/N
  lectura?: string;   // @db.VarChar(1) S/N
}

export class PermisoModel implements Permiso {
  idpermiso: number;
  codusuario?: number;
  idmodulo?: number;
  acceso?: string;
  lectura?: string;

  constructor(init?: Partial<Permiso>) {
    this.idpermiso = init?.idpermiso ?? 0;
    this.codusuario = init?.codusuario ?? undefined;
    this.idmodulo = init?.idmodulo ?? undefined;
    this.acceso = init?.acceso ?? 'N';
    this.lectura = init?.lectura ?? 'N';
  }
}