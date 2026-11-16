-- Informa cuántos conduces y qué monto total cumplen las condiciones
-- de creación de pendientes para la empresa, sucursal y período elegidos.
create or replace function myappdb.plataforma_disponibilidad_pendiente(
  p_empresa text,
  p_sucursal integer,
  p_fecha_desde date,
  p_fecha_hasta date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_empresa text := nullif(btrim(coalesce(p_empresa, '')), '');
  v_cantidad integer := 0;
  v_monto numeric := 0;
begin
  if not app_private.es_dueno_plataforma() then
    raise exception 'Solo el dueño de la plataforma puede consultar la disponibilidad.' using errcode = '42501';
  end if;
  if v_empresa is null or p_sucursal is null or p_fecha_desde is null or p_fecha_hasta is null
     or p_fecha_desde > p_fecha_hasta then
    raise exception 'Indique empresa, sucursal y un período válido.' using errcode = '22023';
  end if;

  select count(*)::integer,
         coalesce(sum(coalesce(f.fa_valfact, 0)), 0)::numeric
    into v_cantidad, v_monto
    from myappdb.factura f
   where btrim(f.fa_codempr::text) = v_empresa
     and f.fa_codsucu = p_sucursal
     and f.fa_fecfact between p_fecha_desde and p_fecha_hasta
     and coalesce(f.fa_tiponcf, 0) = 32
     and upper(btrim(coalesce(f.fa_status, ''))) = 'C'
     and upper(btrim(coalesce(f.fa_fpago, ''))) = 'S'
     and coalesce(f.fa_codfpago, 0) = 1;

  return jsonb_build_object(
    'cantidad_disponible', v_cantidad,
    'monto_disponible', v_monto
  );
end;
$$;

revoke all on function myappdb.plataforma_disponibilidad_pendiente(text, integer, date, date) from public, anon;
grant execute on function myappdb.plataforma_disponibilidad_pendiente(text, integer, date, date) to authenticated;

notify pgrst, 'reload schema';
