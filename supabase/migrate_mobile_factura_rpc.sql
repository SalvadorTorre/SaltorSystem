-- Ejecutar en Supabase SQL Editor.
-- Permite a la app movil consultar una factura y su detalle por codigo
-- sin exponer SELECT amplio sobre myappdb.factura / myappdb.detfactura.
-- Incluye wrapper en public porque PostgREST rpc suele resolver ahi.

begin;

create or replace function myappdb.mobile_fetch_factura_por_codigo(
  p_codigo text
)
returns jsonb
language plpgsql
security definer
set search_path = myappdb, public
as $$
declare
  v_codigo text := btrim(coalesce(p_codigo, ''));
  v_header myappdb.factura%rowtype;
  v_details jsonb := '[]'::jsonb;
begin
  if v_codigo = '' then
    return null;
  end if;

  select *
    into v_header
  from myappdb.factura f
  where f.fa_codfact = v_codigo
     or f.fa_ncffact = v_codigo
     or f.fa_codfact ilike '%' || v_codigo || '%'
     or f.fa_ncffact ilike '%' || v_codigo || '%'
  order by
    case
      when f.fa_codfact = v_codigo then 1
      when f.fa_ncffact = v_codigo then 2
      when f.fa_codfact ilike '%' || v_codigo || '%' then 3
      else 4
    end,
    f.fa_fehora desc nulls last,
    f.fa_fecfact desc nulls last
  limit 1;

  if not found then
    return null;
  end if;

  select coalesce(
    jsonb_agg(to_jsonb(d) order by d.id),
    '[]'::jsonb
  )
    into v_details
  from myappdb.detfactura d
  where d.df_codfact = v_header.fa_codfact;

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
security definer
set search_path = myappdb, public
as $$
  select myappdb.mobile_fetch_factura_por_codigo(p_codigo);
$$;

grant execute on function myappdb.mobile_fetch_factura_por_codigo(text)
to authenticated;
grant execute on function public.mobile_fetch_factura_por_codigo(text)
to authenticated;

commit;

notify pgrst, 'reload schema';
