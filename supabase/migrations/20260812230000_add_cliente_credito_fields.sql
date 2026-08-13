alter table myappdb.clientes
  add column if not exists cl_limclie numeric(14, 2),
  add column if not exists dias integer;

-- El RNC se almacena como texto para conservar ceros a la izquierda.
alter table myappdb.clientes
  alter column cl_rnc type varchar(11)
  using cl_rnc::varchar;

alter table myappdb.clientes
  drop constraint if exists clientes_limite_credito_valido,
  drop constraint if exists clientes_dias_credito_valido;

alter table myappdb.clientes
  add constraint clientes_limite_credito_valido
    check (cl_limclie is null or cl_limclie > 0),
  add constraint clientes_dias_credito_valido
    check (dias is null or dias > 0);

comment on column myappdb.clientes.cl_limclie
  is 'Limite monetario autorizado para clientes de credito.';
comment on column myappdb.clientes.dias
  is 'Cantidad de dias autorizados para pagar a credito.';
