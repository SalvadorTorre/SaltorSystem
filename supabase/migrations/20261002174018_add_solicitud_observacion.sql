alter table myappdb.solicitud
  add column if not exists so_observacion varchar(255);

notify pgrst, 'reload schema';
