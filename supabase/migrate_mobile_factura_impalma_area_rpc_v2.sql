-- Ejecutar en Supabase SQL Editor.
-- Version sin sobrecarga para evitar PGRST202 con la funcion vieja.
-- - p_area = 'forjas' marca fa_impalmaf = 'S'
-- - p_area = 'hierro' marca fa_impalmap = 'S'
-- Cuando ambas areas estan impresas, marca fa_despacho = 'S'.

begin;

create or replace function myappdb.mobile_marcar_factura_impalma_impresa_v2(
  p_codigo text,
  p_area text
)
returns jsonb
language plpgsql
security definer
set search_path = myappdb, public
as $$
declare
  v_codigo text := btrim(coalesce(p_codigo, ''));
  v_area text := lower(btrim(coalesce(p_area, '')));
  v_auth_user_id uuid := auth.uid();
  v_cod_empre text := '';
  v_row myappdb.factura%rowtype;
begin
  if v_codigo = '' then
    return null;
  end if;

  if v_auth_user_id is not null then
    select coalesce(u.cod_empre, '')
      into v_cod_empre
    from myappdb.usuario u
    where u.auth_user_id = v_auth_user_id
    limit 1;
  end if;

  if v_area like '%forja%' then
    update myappdb.factura f
       set fa_impalmaf = 'S'
     where (
             f.fa_codfact = v_codigo
             or f.fa_ncffact = v_codigo
           )
       and (
             v_cod_empre = ''
             or coalesce(f.fa_codempr, '') = v_cod_empre
           )
    returning *
      into v_row;
  elsif v_area like '%hierro%' then
    update myappdb.factura f
       set fa_impalmap = 'S'
     where (
             f.fa_codfact = v_codigo
             or f.fa_ncffact = v_codigo
           )
       and (
             v_cod_empre = ''
             or coalesce(f.fa_codempr, '') = v_cod_empre
           )
    returning *
      into v_row;
  else
    raise exception 'Area de despacho no valida: %.', p_area;
  end if;

  if not found then
    return null;
  end if;

  if coalesce(v_row.fa_impalmap, '') = 'S'
     and coalesce(v_row.fa_impalmaf, '') = 'S'
     and coalesce(v_row.fa_despacho, '') <> 'S' then
    update myappdb.factura f
       set fa_despacho = 'S'
     where f.fa_codfact = v_row.fa_codfact
    returning *
      into v_row;
  end if;

  return jsonb_build_object(
    'fa_codfact', v_row.fa_codfact,
    'fa_ncffact', v_row.fa_ncffact,
    'fa_impalmap', coalesce(v_row.fa_impalmap, ''),
    'fa_impalmaf', coalesce(v_row.fa_impalmaf, ''),
    'fa_despacho', coalesce(v_row.fa_despacho, '')
  );
end;
$$;

create or replace function public.mobile_marcar_factura_impalma_impresa_v2(
  p_codigo text,
  p_area text
)
returns jsonb
language sql
security definer
set search_path = myappdb, public
as $$
  select myappdb.mobile_marcar_factura_impalma_impresa_v2(p_codigo, p_area);
$$;

grant execute on function myappdb.mobile_marcar_factura_impalma_impresa_v2(text, text)
to authenticated;

grant execute on function public.mobile_marcar_factura_impalma_impresa_v2(text, text)
to authenticated;

commit;

notify pgrst, 'reload schema';
