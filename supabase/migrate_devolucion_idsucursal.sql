ALTER TABLE myappdb.devolucion
ADD COLUMN IF NOT EXISTS idsucursal int4;

CREATE INDEX IF NOT EXISTS idx_devolucion_idsucursal
ON myappdb.devolucion (idsucursal);
