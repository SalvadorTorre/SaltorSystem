export interface ModeloRnc{
    status: string;
    code: number;
    message: string;
    data: ModeloRncData[];
  }

  export interface ModeloRncData{
    rnc:    any;
    rason:     string;
    }
