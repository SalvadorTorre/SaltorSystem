-- Ejecutar en Supabase SQL Editor.
-- Version sin sobrecarga del RPC de cierre para evitar PGRST202 por cache/firma.
-- Choferes usa:
--   p_marcar_fpago = true
--   p_marcar_det_pagado = false

begin;

create or replace function myappdb.mobile_cerrar_factura_app_v2(
  p_codigo text,
  p_marcar_fpago boolean,
  p_marcar_det_pagado boolean
)
returns jsonb
language plpgsql
security definer
set search_path = myappdb, public
as $$
declare
  v_codigo text := btrim(coalesce(p_codigo, ''));
  v_auth_user_id uuid := auth.uid();
  v_cod_empre text := '';
  v_row myappdb.factura%rowtype;
  v_det_pagado text := null;
  v_det_entregada text := null;
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

  update myappdb.factura f
     set fa_entrega = 'S',
         fa_fpago = case when p_marcar_fpago then 'S' else f.fa_fpago end
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

  if not found then
    return null;
  end if;

  update myappdb.detsalida d
     set entregada = 'S',
         pagado = case when p_marcar_det_pagado then 'S' else d.pagado end
   where d.codfact = v_row.fa_codfact
      or (coalesce(v_row.fa_ncffact, '') <> '' and d.codfact = v_row.fa_ncffact);

  select coalesce(max(d.entregada), '')
    into v_det_entregada
  from myappdb.detsalida d
  where d.codfact = v_row.fa_codfact
     or (coalesce(v_row.fa_ncffact, '') <> '' and d.codfact = v_row.fa_ncffact);

  if p_marcar_det_pagado then
    select coalesce(max(d.pagado), '')
      into v_det_pagado
    from myappdb.detsalida d
    where d.codfact = v_row.fa_codfact
       or (coalesce(v_row.fa_ncffact, '') <> '' and d.codfact = v_row.fa_ncffact);
  end if;

  return jsonb_build_object(
    'fa_codfact', v_row.fa_codfact,
    'fa_ncffact', v_row.fa_ncffact,
    'fa_entrega', coalesce(v_row.fa_entrega, ''),
    'fa_fpago', coalesce(v_row.fa_fpago, ''),
    'det_entregada', coalesce(v_det_entregada, ''),
    'det_pagado', coalesce(v_det_pagado, '')
  );
end;
$$;

create or replace function public.mobile_cerrar_factura_app_v2(
  p_codigo text,
  p_marcar_fpago boolean,
  p_marcar_det_pagado boolean
)
returns jsonb
language sql
security definer
set search_path = myappdb, public
as $$
  select myappdb.mobile_cerrar_factura_app_v2(
    p_codigo,
    p_marcar_fpago,
    p_marcar_det_pagado
  );
$$;

grant execute on function myappdb.mobile_cerrar_factura_app_v2(text, boolean, boolean)
to authenticated;

grant execute on function public.mobile_cerrar_factura_app_v2(text, boolean, boolean)
to authenticated;

commit;

notify pgrst, 'reload schema';
