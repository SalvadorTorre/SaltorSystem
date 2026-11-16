-- Busqueda rapida de suplidores por nombre (Orden de compra).
--
-- La lista tardaba porque se leia myappdb.suplidor directo por la API: con
-- RLS se evalua la politica por cada fila y el filtro "contiene" (ilike
-- '%texto%') recorre toda la tabla.
--
-- Ahora:
--  * Indice por nombre en minusculas (text_pattern_ops) para busqueda por
--    "empieza con" mientras se escribe.
--  * RPC buscar_suplidores: primero los que EMPIEZAN con lo escrito (usa el
--    indice); si faltan, completa con los que lo CONTIENEN. Una sola llamada,
--    sin RLS fila por fila.

create index if not exists idx_suplidor_nombre_prefijo
  on myappdb.suplidor (lower(su_nomsupl) text_pattern_ops);

create or replace function myappdb.buscar_suplidores(
  p_texto text,
  p_limite integer default 15
)
returns table (
  su_codsupl integer,
  su_nomsupl varchar,
  su_rncsupl varchar,
  su_telsupl varchar
)
language plpgsql
stable
security definer
set search_path = myappdb, public
as $$
declare
  v_texto text := lower(btrim(coalesce(p_texto, '')));
  v_limite integer := least(greatest(coalesce(p_limite, 15), 1), 50);
begin
  if auth.uid() is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;
  if v_texto = '' then
    return;
  end if;

  return query
  with empieza as (
    select s.su_codsupl, s.su_nomsupl, s.su_rncsupl, s.su_telsupl, 0 as prioridad
    from myappdb.suplidor s
    where lower(s.su_nomsupl) like v_texto || '%'
      and coalesce(s.su_status, true)
    order by lower(s.su_nomsupl)
    limit v_limite
  ),
  contiene as (
    select s.su_codsupl, s.su_nomsupl, s.su_rncsupl, s.su_telsupl, 1 as prioridad
    from myappdb.suplidor s
    where lower(s.su_nomsupl) like '%' || v_texto || '%'
      and lower(s.su_nomsupl) not like v_texto || '%'
      and coalesce(s.su_status, true)
      and (select count(*) from empieza) < v_limite
    order by lower(s.su_nomsupl)
    limit v_limite
  )
  select x.su_codsupl, x.su_nomsupl, x.su_rncsupl, x.su_telsupl
  from (select * from empieza union all select * from contiene) x
  order by x.prioridad, lower(x.su_nomsupl)
  limit v_limite;
end;
$$;

revoke all on function myappdb.buscar_suplidores(text, integer) from public;
grant execute on function myappdb.buscar_suplidores(text, integer) to authenticated;

notify pgrst, 'reload schema';
