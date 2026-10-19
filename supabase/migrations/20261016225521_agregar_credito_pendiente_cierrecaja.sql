begin;

alter table myappdb.cierrecaja
  add column if not exists tcredito numeric(12,2) not null default 0,
  add column if not exists tpendiente numeric(12,2) not null default 0;

comment on column myappdb.cierrecaja.tcredito is
  'Total de facturas a credito pendientes incluido en el cierre.';

comment on column myappdb.cierrecaja.tpendiente is
  'Total de otras facturas pendientes de pago incluido en el cierre.';

commit;

notify pgrst, 'reload schema';
