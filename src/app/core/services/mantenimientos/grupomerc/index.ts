export interface ModeloGrupoMercancias {
  status:  string;
  code:    number;
  message: string;
  data:    ModeloGrupoMercanciasData[];
}

export interface ModeloGrupoMercanciasData {
  Codgrupo:  string;
  Descgrupo:  string;
  Tipomerc:  string;
}
