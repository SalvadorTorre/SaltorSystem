alter table if exists myappdb.ventainterna
  add column if not exists suculsar_clie varchar(60);

alter table if exists myappdb.ventainterna
  alter column fa_codclie type varchar(10)
  using fa_codclie::varchar;

alter table if exists myappdb.detventainterna
  alter column df_codclie type varchar(10)
  using df_codclie::varchar;
