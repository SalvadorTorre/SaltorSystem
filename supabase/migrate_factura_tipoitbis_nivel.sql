-- Ejecutar en Supabase SQL Editor.
-- Agrega la relacion entre tipo de comprobante, nivel de ITBIS y factura.

begin;

alter table myappdb.tiponcf
  add column if not exists nivel_itbis varchar(20);

alter table myappdb.factura
  add column if not exists fa_tipoitbis varchar(20);

create index if not exists idx_tiponcf_nivel_itbis
  on myappdb.tiponcf (nivel_itbis);

create index if not exists idx_factura_tipoitbis
  on myappdb.factura (fa_tipoitbis);

grant select, update on table myappdb.tiponcf to anon, authenticated;
grant select, insert, update on table myappdb.factura to anon, authenticated;

commit;

notify pgrst, 'reload schema';
