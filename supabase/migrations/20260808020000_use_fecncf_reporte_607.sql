-- El periodo fiscal del Reporte 607 se determina por la fecha del comprobante.
-- Se reemplazan los indices anteriores para alinear el plan con fa_fecncf.
drop index if exists myappdb.idx_factura_607_export_scope;
create index idx_factura_607_export_scope
  on myappdb.factura (
    fa_codempr,
    fa_codsucu,
    fa_fecncf desc,
    fa_codfact desc
  )
  where estado_envio_dgii is not null
    and estado_envio_dgii <> 'PENDIENTE';

drop index if exists myappdb.idx_factura_607_export_tipo;
create index idx_factura_607_export_tipo
  on myappdb.factura (
    fa_codempr,
    fa_codsucu,
    fa_tiponcf,
    fa_fecncf desc,
    fa_codfact desc
  )
  where estado_envio_dgii is not null
    and estado_envio_dgii <> 'PENDIENTE';
