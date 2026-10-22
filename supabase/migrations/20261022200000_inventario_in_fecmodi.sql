-- Fecha de la ultima modificacion de precio por sucursal.
-- /mantenimientos/precio guarda la fecha del dia en productos2.in_fecmodi
-- y en inventario.in_fecmodi cada vez que se cambia un precio.

ALTER TABLE myappdb.inventario
  ADD COLUMN IF NOT EXISTS in_fecmodi date;

COMMENT ON COLUMN myappdb.inventario.in_fecmodi IS
  'Fecha del ultimo cambio de precio del producto en esta sucursal (Mantenimiento de precios).';

NOTIFY pgrst, 'reload schema';
