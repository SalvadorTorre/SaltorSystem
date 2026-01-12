export interface ModeloInventario {
  status: string;
  code: number;
  message: string;
  data: ModeloInventarioData[];
}

export interface ModeloInventarioData {
  in_codmerc: string;
  in_desmerc: string;
  in_grumerc: string;
  in_tipoproduct: string;
  in_canmerc: number;
  in_caninve: number;
  in_fecinve: null;
  in_eximini: number;
  in_cosmerc: number;
  in_premerc: number;
  in_precmin: number;
  in_costpro?: number;
  in_ucosto: number;
  in_porgana: number;
  in_peso: number;
  in_longitud: number;
  in_unidad: number;
  in_medida: number;
  in_longitu: number;
  in_fecmodif: null;
  in_amacen: number;
  in_imagen: string;
  in_status: string;
  in_itbis: boolean;
  in_minvent: number;
  in_tramo?: string;
}
