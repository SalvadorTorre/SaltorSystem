-- Optimiza el Rep. 607 cuando un administrador consulta todas las sucursales.
-- La sucursal no puede preceder la fecha porque en este caso no se filtra.
create index if not exists idx_factura_607_empresa_fecha
  on myappdb.factura (
    fa_codempr,
    fa_fecncf desc,
    fa_codfact desc
  )
  where estado_envio_dgii is not null
    and estado_envio_dgii <> 'PENDIENTE';

create index if not exists idx_factura_607_empresa_tipo_fecha
  on myappdb.factura (
    fa_codempr,
    fa_tiponcf,
    fa_fecncf desc,
    fa_codfact desc
  )
  where estado_envio_dgii is not null
    and estado_envio_dgii <> 'PENDIENTE';
