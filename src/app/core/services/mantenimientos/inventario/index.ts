export interface ModeloInventario {
  status:  string;
  code:    number;
  message: string;
  data:    ModeloInventarioData[];
}

export interface ModeloInventarioData {
  in_codmerc:  string;
  in_desmerc:  string;
  in_grumerc:  number;
  in_tramo:    string;
  in_canmerc:  string;
  in_caninve:  string;
  in_fecinve:  null;
  in_eximini:  string;
  in_cosmerc:  null;
  in_premerc:  string;
  in_precmin:  string;
  in_costpro:  string;
  in_ucosto:   string;
  in_porgana:  string;
  in_peso:     string;
  in_longitud: null;
  in_unidad:   string;
  in_medida:   null;
  in_longitu:  null;
  in_fecmodif: null;
  in_amacen:   string;
  in_imagen:   string;
  in_status:   string;
}
