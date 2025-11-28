export interface DetalleSalidaModel {
    status:  string;
    code:    number;
    message: string;
    data:    DetalleSalidaDataModel[];
}

export interface DetalleSalidaDataModel {
    codSalida:     string;
    fecFact:       Date;
    codFact:       string;
    codChofer:     string;
    nomChofer:     string;
    valFact:      string;
    nomClie :      string;
    valAbono:      string;
    devolucion:    string;
    valDevolucion: string;
    entregada:     null;
    pagado:        null;
    status:        null;
    imp:           null;
}
