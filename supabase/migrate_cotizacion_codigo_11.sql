-- Permite usar el numero de cotizacion generado con:
-- ano(4) + idsucursal(2) + contcotizacion(5) = 11 caracteres.

ALTER TABLE myappdb.detcotizacion
  DROP CONSTRAINT IF EXISTS detcotizacion_ibfk_1;

ALTER TABLE myappdb.cotizacion
  ALTER COLUMN ct_codcoti TYPE varchar(11)
  USING trim(ct_codcoti)::varchar(11);

ALTER TABLE myappdb.detcotizacion
  ALTER COLUMN dc_codcoti TYPE varchar(11)
  USING trim(dc_codcoti)::varchar(11);

ALTER TABLE myappdb.detcotizacion
  ADD CONSTRAINT detcotizacion_ibfk_1
  FOREIGN KEY (dc_codcoti)
  REFERENCES myappdb.cotizacion (ct_codcoti)
  ON DELETE RESTRICT
  ON UPDATE RESTRICT;

NOTIFY pgrst, 'reload schema';
