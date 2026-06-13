export type TipoCuentaBancaria = 'CORRIENTE' | 'AHORRO' | 'TARJETA' | 'OTRA';
export type MonedaCuentaBancaria = 'DOP' | 'USD' | 'EUR';

export interface CuentaBancariaData {
  id?: number;
  codigo: string;
  nombre: string;
  banco: string;
  numero_cuenta: string;
  tipo_cuenta: TipoCuentaBancaria;
  moneda: MonedaCuentaBancaria;
  titular?: string | null;
  cod_empre?: string | null;
  sucursalid?: number | null;
  es_default?: boolean;
  activo?: boolean;
  notas?: string | null;
  creado_en?: string;
  actualizado_en?: string;
  descripcion?: string;
}
