-- Alinea el indice con el filtro, el alcance multiempresa y el orden del Rep. 607.
-- Es parcial para no aumentar innecesariamente el costo de escritura de factura.
CREATE INDEX IF NOT EXISTS idx_factura_607_export_scope
  ON myappdb.factura (
    fa_codempr,
    fa_codsucu,
    fa_fecfact DESC,
    fa_codfact DESC
  )
  WHERE estado_envio_dgii IS NOT NULL
    AND estado_envio_dgii <> 'PENDIENTE';

-- Cuando se filtra por tipo, conserva empresa/sucursal/fecha como prefijo util.
CREATE INDEX IF NOT EXISTS idx_factura_607_export_tipo
  ON myappdb.factura (
    fa_codempr,
    fa_codsucu,
    fa_tiponcf,
    fa_fecfact DESC,
    fa_codfact DESC
  )
  WHERE estado_envio_dgii IS NOT NULL
    AND estado_envio_dgii <> 'PENDIENTE';
