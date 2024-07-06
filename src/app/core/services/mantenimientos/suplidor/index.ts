export interface ModeloSuplidor{
    status: string;
    code: number;
    message: string;
    data: ModeloSuplidorData[];
  }
  
  export interface ModeloSuplidorData{
  
    su_codsupl: any;
    su_nomsupl: string;
    su_dirSupl: string;
    su_telSupl: string;
    su_contact: string;
    su_status: boolean;
    su_rncSupl: number;
  }
  