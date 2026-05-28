-- Ejecutar en Supabase SQL Editor.
-- Marca la factura como impresa por almacen/despacho movil.

begin;

create or replace function myappdb.mobile_marcar_factura_impalma_impresa(
  p_codigo text
)
returns jsonb
language plpgsql
security definer
set search_path = myappdb, public
as $$
declare
  v_codigo text := btrim(coalesce(p_codigo, ''));
  v_row myappdb.factura%rowtype;
begin
  if v_codigo = '' then
    return null;
  end if;

  update myappdb.factura
     set fa_impalmap = 'S'
   where fa_codfact = v_codigo
   returning *
    into v_row;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'fa_codfact', v_row.fa_codfact,
    'fa_impalmap', v_row.fa_impalmap
  );
end;
$$;

create or replace function public.mobile_marcar_factura_impalma_impresa(
  p_codigo text
)
returns jsonb
language sql
security definer
set search_path = myappdb, public
as $$
  select myappdb.mobile_marcar_factura_impalma_impresa(p_codigo);
$$;

grant execute on function myappdb.mobile_marcar_factura_impalma_impresa(text)
to authenticated;

grant execute on function public.mobile_marcar_factura_impalma_impresa(text)
to authenticated;

commit;

notify pgrst, 'reload schema';
