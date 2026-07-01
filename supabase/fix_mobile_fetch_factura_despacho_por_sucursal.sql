-- Ejecutar en Supabase SQL Editor.
-- Reemplaza el RPC mobile_fetch_factura_por_codigo para despacho usando SOLO:
--   factura.fa_codfact = p_codigo
--   factura.fa_codsucu = usuario.sucursalid del usuario logiado
-- No usa fa_ncffact ni fa_codempr para encontrar la factura.

begin;

drop function if exists public.mobile_fetch_factura_por_codigo(text, integer);
drop function if exists myappdb.mobile_fetch_factura_por_codigo(text, integer);

create or replace function myappdb.mobile_fetch_factura_por_codigo(
  p_codigo text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = myappdb, public
as $$
declare
  v_codigo text := btrim(coalesce(p_codigo, ''));
  v_auth_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt()->>'email', ''));
  v_sucursalid integer;
  v_codusuario integer;
  v_header myappdb.factura%rowtype;
  v_details jsonb := '[]'::jsonb;
begin
  if position('|' in v_codigo) > 0 then
    v_sucursalid := nullif(regexp_replace(split_part(v_codigo, '|', 2), '[^0-9]', '', 'g'), '')::integer;
    v_codigo := btrim(split_part(v_codigo, '|', 1));
  end if;

  if v_codigo = '' or v_auth_user_id is null then
    return null;
  end if;

  if v_sucursalid is null then
    select u.codusuario, u.sucursalid
      into v_codusuario, v_sucursalid
    from myappdb.usuario u
    where
      u.auth_user_id = v_auth_user_id
      or lower(coalesce(u.correo, '')) = v_email
      or lower(coalesce(u.idusuario, '') || '@saltorsystem.local') = v_email
      or lower(coalesce(u.idusuario, '') || '@usuario.saltorsystem.local') = v_email
    order by
      case when u.auth_user_id = v_auth_user_id then 0 else 1 end,
      u.codusuario
    limit 1;
  end if;

  if v_sucursalid is null then
    return null;
  end if;

  select *
    into v_header
  from myappdb.factura f
  where btrim(coalesce(f.fa_codfact::text, '')) = v_codigo
    and nullif(regexp_replace(coalesce(f.fa_codsucu::text, ''), '[^0-9]', '', 'g'), '')::integer = v_sucursalid
  order by f.fa_fehora desc nulls last, f.fa_fecfact desc nulls last
  limit 1;

  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(to_jsonb(d) order by d.id), '[]'::jsonb)
    into v_details
  from myappdb.detfactura d
  where btrim(coalesce(d.df_codfact::text, '')) = btrim(coalesce(v_header.fa_codfact::text, ''));

  return jsonb_build_object(
    'header', to_jsonb(v_header),
    'details', v_details
  );
end;
$$;

create or replace function public.mobile_fetch_factura_por_codigo(
  p_codigo text
)
returns jsonb
language sql
stable
security definer
set search_path = myappdb, public
as $$
  select myappdb.mobile_fetch_factura_por_codigo(p_codigo::text);
$$;

revoke all on function myappdb.mobile_fetch_factura_por_codigo(text) from public;
revoke all on function public.mobile_fetch_factura_por_codigo(text) from public;

grant execute on function myappdb.mobile_fetch_factura_por_codigo(text) to authenticated, service_role;
grant execute on function public.mobile_fetch_factura_por_codigo(text) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
