-- Mejora la carga inicial de /almacen/controlfact.
-- La pantalla filtra por empresa y sucursal, ordenando por fecha y numero.

create index if not exists idx_factura_controlfact_tenant_fecha
on myappdb.factura (
  fa_codempr,
  fa_codsucu,
  fa_fecfact desc,
  fa_codfact desc
);

analyze myappdb.factura;
