-- Nota de credito: forma de pago de la factura (transferencia, efectivo, ...).
--
-- nc_tipo_pago es el TipoPago que se envia a la DGII y siempre es 1 (contado).
-- Antes, una factura con forma de pago 2 (transferencia) se tomaba como
-- "credito" (TipoPago 2) y la DGII rechazaba la nota.
-- La forma de pago real se guarda aparte en nc_forma_pago (codigo de fpago).

alter table myappdb.nota_credito
  add column if not exists nc_forma_pago integer;

comment on column myappdb.nota_credito.nc_forma_pago is
  'Forma de pago de la factura afectada (myappdb.fpago.fp_codfpago).';
comment on column myappdb.nota_credito.nc_tipo_pago is
  'TipoPago enviado a la DGII. Siempre 1 (contado).';

-- Notas ya guardadas como credito por error: quedan en contado.
-- nc_tipo_pago es texto (varchar): se compara y se guarda como '1'.
update myappdb.nota_credito
   set nc_tipo_pago = '1'
 where btrim(coalesce(nc_tipo_pago::text, '1')) <> '1';

notify pgrst, 'reload schema';
