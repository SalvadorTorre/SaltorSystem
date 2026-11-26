export type ModoConcurso = 'MULTIPLO' | 'RANGO';
export type TipoConcurso = 'RIFA' | 'SORTEO';
export type BaseCalculoConcurso = 'TOTAL' | 'SUBTOTAL';

/** Escala del modo RANGO: desde este monto se entregan N boletos. */
export interface RangoConcurso {
  desde: number;
  boletos: number;
}

export interface ConcursoData {
  id?: number;
  codempresa: string;
  codsucursal: number | null;
  nombre: string;
  tipo: TipoConcurso;
  descripcion?: string | null;
  premios?: string | null;
  fecha_inicio: string; // yyyy-mm-dd
  fecha_fin: string; // yyyy-mm-dd
  activo: boolean;
  modo: ModoConcurso;
  monto_por_boleto: number;
  monto_minimo: number;
  max_boletos_factura: number | null;
  rangos: RangoConcurso[];
  base_calculo: BaseCalculoConcurso;
  aplica_contado: boolean;
  aplica_credito: boolean;
  solo_pagadas: boolean;
  /** true = solo facturas con un cliente registrado; false = todos los clientes. */
  solo_clientes_registrados: boolean;
  ultimo_boleto?: number;
  created_at?: string;
  updated_at?: string;
}

/** Boletos de una factura en un concurso (respuesta de generar_boletos_factura). */
export interface BoletosConcursoFactura {
  concurso_id: number;
  nombre: string;
  tipo: TipoConcurso;
  premios?: string | null;
  descripcion?: string | null;
  fecha_fin: string;
  numeros: number[];
  nuevos: boolean;
}

export interface BoletosFactura {
  codfact: string;
  fecha: string;
  cliente?: string | null;
  telefono?: string | null;
  concursos: BoletosConcursoFactura[];
}

export type EstadoConcurso = 'INACTIVO' | 'PROGRAMADO' | 'VIGENTE' | 'FINALIZADO';
