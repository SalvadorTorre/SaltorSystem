begin;

alter table myappdb.configuracion_global
  add column if not exists dgii_modo_envio varchar(10) not null default 'COLA';

alter table myappdb.configuracion_global
  drop constraint if exists configuracion_global_dgii_modo_envio_check;

alter table myappdb.configuracion_global
  add constraint configuracion_global_dgii_modo_envio_check
  check (dgii_modo_envio in ('COLA', 'DIRECTO'));

update myappdb.configuracion_global
set dgii_modo_envio = 'COLA'
where dgii_modo_envio is null
   or dgii_modo_envio not in ('COLA', 'DIRECTO');

commit;

notify pgrst, 'reload schema';
