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
  created_at?: string;
  updated_at?: string;
}

export type EstadoConcurso = 'INACTIVO' | 'PROGRAMADO' | 'VIGENTE' | 'FINALIZADO';
