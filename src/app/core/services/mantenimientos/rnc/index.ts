export interface ModeloRnc {
  status: string;
  code: number;
  message: string;
  data: {
    data: ModeloRncData[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface ModeloRncData {
  id: number;
  rnc: string;
  rason: string;
  status: string | null;
}
