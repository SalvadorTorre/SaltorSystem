export interface ModeloUsuario {
  status: string;
  code: number;
  message: string;
  data: ModeloUsuarioData[];
}

export interface ModeloUsuarioData {
  codUsuario: any;
  idUsuario: string;
  claveUsuario: string;
  nombreUsuario: string;
  nivel: number;
  nivel2: string;
  facturacion: boolean;
  factLectura: boolean;
  compra: boolean;
  compLectura: boolean;
  reporte: boolean;
  repLectura: boolean;
  mantenimiento: boolean;
  mantLectura: boolean;
  caja: boolean;
  caja_Lectura: boolean;
  almacen: boolean;
  almLectura: boolean;
  contabilidad: boolean;
  contLectura: boolean;
  mercadeo: boolean;
  usuario: boolean;
  credito: boolean;
  vendedor: boolean;
  metaVenta: string;
  correo: string;
  claveCorreo: string;
  // Nuevos campos opcionales según requerimiento del modelo Usuario
  idtipoUsuario?: number;
  sucursalid?: number;
  idpermiso?: number;
  cod_empre?: string;
  despacho?: boolean;
  empresa: string;
  sucursal: number;
  empresaInfo: any;
  sucursalInfo: any;
}

