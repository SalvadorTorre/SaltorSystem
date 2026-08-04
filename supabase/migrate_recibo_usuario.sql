ALTER TABLE myappdb.recibo
  ADD COLUMN IF NOT EXISTS codusuario varchar(120),
  ADD COLUMN IF NOT EXISTS nombreusuario varchar(180),
  ADD COLUMN IF NOT EXISTS codsucu integer;

CREATE INDEX IF NOT EXISTS idx_recibo_nombreusuario_sucursal_id
  ON myappdb.recibo (nombreusuario, codsucu, id DESC);

CREATE INDEX IF NOT EXISTS idx_recibo_codusuario_sucursal_id
  ON myappdb.recibo (codusuario, codsucu, id DESC);

NOTIFY pgrst, 'reload schema';
