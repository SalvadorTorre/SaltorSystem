-- Alinea la tabla física con los campos que maneja GastosMenoresService.
begin;

alter table myappdb.gasto_menor
  add column if not exists gm_categoria varchar(100),
  add column if not exists gm_forma_pago varchar(100),
  add column if not exists gm_proveedor_nombre varchar(200),
  add column if not exists gm_proveedor_rnc varchar(20),
  add column if not exists gm_ncf_proveedor varchar(30),
  add column if not exists gm_comentario text,
  add column if not exists gm_anulado boolean not null default false;

notify pgrst, 'reload schema';

commit;
