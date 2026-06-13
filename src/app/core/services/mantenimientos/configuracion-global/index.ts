export interface ConfiguracionGlobalData {
  id?: number;
  logoDataUrl?: string | null;
  logoNombre?: string | null;
  certificadoNombre?: string | null;
  certificadoP12Base64?: string | null;
  certificadoPassword?: string | null;
  certificadoVence?: string | null;
  certificadoSubjectCn?: string | null;
  certificadoIssuerCn?: string | null;
  dgiiBaseUrl?: string | null;
  dgiiAmbiente?: 'test' | 'prod' | string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface CertificadoInspeccion {
  notBefore?: string | null;
  notAfter?: string | null;
  subjectCn?: string | null;
  issuerCn?: string | null;
}

export interface ConfiguracionDgiiEmpresaData {
  codEmpre: string;
  nombreEmpresa: string;
  rncEmpresa?: string | null;
  dgiiAmbiente: 'test' | 'prod';
  activo: boolean;
  notas?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
}
