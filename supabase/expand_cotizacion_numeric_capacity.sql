-- Evita numeric field overflow en cotizaciones de alto valor o con muchos items.
ALTER TABLE myappdb.cotizacion
  ALTER COLUMN ct_valcoti TYPE numeric(18,2),
  ALTER COLUMN ct_itbis TYPE numeric(18,2);

ALTER TABLE myappdb.detcotizacion
  ALTER COLUMN dc_canmerc TYPE numeric(18,2),
  ALTER COLUMN dc_premerc TYPE numeric(18,2),
  ALTER COLUMN dc_valmerc TYPE numeric(18,2),
  ALTER COLUMN dc_costmer TYPE numeric(18,2);
