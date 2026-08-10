-- Mantiene eficiente el orden fiscal solicitado: fecha e-NCF y numero e-NCF.
drop index if exists myappdb.idx_factura_607_empresa_fecha;
create index idx_factura_607_empresa_fecha
  on myappdb.factura (
    fa_codempr,
    fa_fecncf desc,
    fa_ncffact desc
  )
  where estado_envio_dgii is not null
    and estado_envio_dgii <> 'PENDIENTE';

drop index if exists myappdb.idx_factura_607_export_scope;
create index idx_factura_607_export_scope
  on myappdb.factura (
    fa_codempr,
    fa_codsucu,
    fa_fecncf desc,
    fa_ncffact desc
  )
  where estado_envio_dgii is not null
    and estado_envio_dgii <> 'PENDIENTE';
