-- Mejora la busqueda iterativa por nombre en /almacen/controlfact y /facturacion.
-- La pantalla busca por empresa, sucursal y nombres que comienzan con el texto digitado.

create index if not exists idx_factura_tenant_nomclie_codfact_range
on myappdb.factura (
  fa_codempr,
  fa_codsucu,
  fa_nomclie,
  fa_codfact desc
);

analyze myappdb.factura;
