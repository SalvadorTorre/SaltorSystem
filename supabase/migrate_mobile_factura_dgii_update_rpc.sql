-- Ejecutar en Supabase SQL Editor.
-- Permite a la app movil actualizar los datos DGII de una factura
-- usando security definer y filtrando por la empresa del usuario autenticado.

begin;

create or replace function myappdb.mobile_actualizar_datos_dgii_factura(
  p_codigo text,
  p_estado_dgii text default null,
  p_codseguridad text default null,
  p_qr_link text default null,
  p_fec_firma text default null,
  p_ecf text default null,
  p_rfce text default null,
  p_estado_envio_dgii text default null,
  p_fa_status text default null
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
     set estado_dgii = coalesce(p_estado_dgii, f.estado_dgii),
         codseguridad = coalesce(p_codseguridad, f.codseguridad),
         qr_link = coalesce(p_qr_link, f.qr_link),
         fec_firma = coalesce(p_fec_firma, f.fec_firma),
         ecf = coalesce(p_ecf, f.ecf),
         rfce = coalesce(p_rfce, f.rfce),
         estado_envio_dgii = coalesce(p_estado_envio_dgii, f.estado_envio_dgii),
         fa_status = coalesce(p_fa_status, f.fa_status)
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

  return jsonb_build_object(
    'fa_codfact', v_row.fa_codfact,
    'fa_status', v_row.fa_status,
    'estado_dgii', v_row.estado_dgii,
    'estado_envio_dgii', v_row.estado_envio_dgii,
    'qr_link', v_row.qr_link
  );
end;
$$;

create or replace function public.mobile_actualizar_datos_dgii_factura(
  p_codigo text,
  p_estado_dgii text default null,
  p_codseguridad text default null,
  p_qr_link text default null,
  p_fec_firma text default null,
  p_ecf text default null,
  p_rfce text default null,
  p_estado_envio_dgii text default null,
  p_fa_status text default null
)
returns jsonb
language sql
security definer
set search_path = myappdb, public
as $$
  select myappdb.mobile_actualizar_datos_dgii_factura(
    p_codigo,
    p_estado_dgii,
    p_codseguridad,
    p_qr_link,
    p_fec_firma,
    p_ecf,
    p_rfce,
    p_estado_envio_dgii,
    p_fa_status
  );
$$;

grant execute on function myappdb.mobile_actualizar_datos_dgii_factura(
  text, text, text, text, text, text, text, text, text
)
to authenticated;

grant execute on function public.mobile_actualizar_datos_dgii_factura(
  text, text, text, text, text, text, text, text, text
)
to authenticated;

commit;

notify pgrst, 'reload schema';
