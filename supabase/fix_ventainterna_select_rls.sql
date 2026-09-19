begin;

alter table myappdb.ventainterna enable row level security;

create index if not exists idx_ventainterna_sucursal_codigo
on myappdb.ventainterna (fa_codsucu, fa_codfact desc);

drop policy if exists ventainterna_select_sucursal on myappdb.ventainterna;

create policy ventainterna_select_sucursal
on myappdb.ventainterna
for select
to authenticated
using (
  app_private.can_access_row(
    fa_codempr::text,
    fa_codsucu::text,
    null,
    null
  )
);

grant select on table myappdb.ventainterna to authenticated;

commit;
