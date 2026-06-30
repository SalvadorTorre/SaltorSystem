-- Wrappers no destructivos para clientes mobile que llaman RPC sin schema explicito.
-- PostgREST tiene public como primer schema, por eso estas funciones delegan a myappdb.

create or replace function public.mobile_fetch_factura_por_codigo(p_codigo text)
returns jsonb
language sql
stable
security definer
set search_path = myappdb, public
as $$
  select myappdb.mobile_fetch_factura_por_codigo(p_codigo);
$$;

create or replace function public.mobile_asignar_encf_factura(p_codigo text)
returns jsonb
language sql
volatile
security definer
set search_path = myappdb, public
as $$
  select myappdb.mobile_asignar_encf_factura(p_codigo);
$$;

create or replace function public.mobile_actualizar_datos_dgii_factura(
  p_codigo text,
  p_estado_dgii text,
  p_codseguridad text,
  p_qr_link text,
  p_fec_firma text,
  p_ecf text,
  p_rfce text,
  p_estado_envio_dgii text,
  p_fa_status text
)
returns jsonb
language sql
volatile
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

create or replace function public.mobile_marcar_factura_impalma_impresa_v2(
  p_codigo text,
  p_area text
)
returns jsonb
language sql
volatile
security definer
set search_path = myappdb, public
as $$
  select myappdb.mobile_marcar_factura_impalma_impresa_v2(p_codigo, p_area);
$$;

revoke all on function public.mobile_fetch_factura_por_codigo(text) from public;
revoke all on function public.mobile_asignar_encf_factura(text) from public;
revoke all on function public.mobile_actualizar_datos_dgii_factura(text, text, text, text, text, text, text, text, text) from public;
revoke all on function public.mobile_marcar_factura_impalma_impresa_v2(text, text) from public;

grant execute on function public.mobile_fetch_factura_por_codigo(text) to authenticated, service_role;
grant execute on function public.mobile_asignar_encf_factura(text) to authenticated, service_role;
grant execute on function public.mobile_actualizar_datos_dgii_factura(text, text, text, text, text, text, text, text, text) to authenticated, service_role;
grant execute on function public.mobile_marcar_factura_impalma_impresa_v2(text, text) to authenticated, service_role;
