-- Corrección separada para instalaciones donde la migración original ya fue registrada.
-- Solo considera conduces en efectivo, pagados y todavía en estado C.

create or replace function myappdb.plataforma_preparar_pendiente(
  p_empresa text,
  p_sucursal integer,
  p_monto numeric
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_empresa text := nullif(btrim(coalesce(p_empresa, '')), '');
  v_resultado jsonb;
begin
  if not app_private.es_dueno_plataforma() then
    raise exception 'Solo el dueño de la plataforma puede preparar pendientes.' using errcode = '42501';
  end if;
  if v_empresa is null or p_sucursal is null or coalesce(p_monto, 0) <= 0 then
    raise exception 'Indique empresa, sucursal y un monto mayor que cero.' using errcode = '22023';
  end if;

  with candidatos as (
    select row_number() over (order by f.fa_fecfact, f.fa_codfact) as orden,
           f.fa_codfact::text as factura,
           f.fa_fecfact::date as fecha,
           coalesce(f.fa_nomclie, '')::text as cliente,
           coalesce(f.fa_valfact, 0)::numeric as valor
      from myappdb.factura f
     where btrim(f.fa_codempr::text) = v_empresa
       and f.fa_codsucu = p_sucursal
       and upper(btrim(coalesce(f.fa_status, ''))) = 'C'
       and upper(btrim(coalesce(f.fa_fpago, ''))) = 'S'
       and coalesce(f.fa_codfpago, 0) = 1
  ), acumulados as (
    select c.*, sum(c.valor) over (order by c.orden)::numeric as acumulado from candidatos c
  ), corte as (
    select a.orden from acumulados a order by abs(a.acumulado - p_monto), a.orden limit 1
  ), seleccion as (
    select a.* from acumulados a where a.orden <= coalesce((select orden from corte), 0)
  )
  select jsonb_build_object(
    'monto_solicitado', p_monto,
    'cantidad', count(*)::integer,
    'suma_seleccionada', coalesce(sum(s.valor), 0),
    'balance', p_monto - coalesce(sum(s.valor), 0),
    'conduces', coalesce(jsonb_agg(jsonb_build_object(
      'factura', s.factura, 'fecha', s.fecha, 'cliente', s.cliente,
      'valor', s.valor, 'acumulado', s.acumulado
    ) order by s.orden) filter (where s.factura is not null), '[]'::jsonb)
  ) into v_resultado
  from seleccion s;

  return v_resultado;
end;
$$;

create or replace function myappdb.plataforma_confirmar_pendiente(
  p_empresa text,
  p_sucursal integer,
  p_monto numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa text := nullif(btrim(coalesce(p_empresa, '')), '');
  v_codigos text[] := array[]::text[];
  v_cantidad integer := 0;
  v_total numeric := 0;
  v_actualizadas integer := 0;
begin
  if not app_private.es_dueno_plataforma() then
    raise exception 'Solo el dueño de la plataforma puede crear pendientes.' using errcode = '42501';
  end if;
  if v_empresa is null or p_sucursal is null or coalesce(p_monto, 0) <= 0 then
    raise exception 'Indique empresa, sucursal y un monto mayor que cero.' using errcode = '22023';
  end if;

  perform 1
    from myappdb.factura f
   where btrim(f.fa_codempr::text) = v_empresa
     and f.fa_codsucu = p_sucursal
     and upper(btrim(coalesce(f.fa_status, ''))) = 'C'
     and upper(btrim(coalesce(f.fa_fpago, ''))) = 'S'
     and coalesce(f.fa_codfpago, 0) = 1
   order by f.fa_fecfact, f.fa_codfact
   for update;

  with candidatos as (
    select row_number() over (order by f.fa_fecfact, f.fa_codfact) as orden,
           f.fa_codfact::text as factura,
           coalesce(f.fa_valfact, 0)::numeric as valor
      from myappdb.factura f
     where btrim(f.fa_codempr::text) = v_empresa
       and f.fa_codsucu = p_sucursal
       and upper(btrim(coalesce(f.fa_status, ''))) = 'C'
       and upper(btrim(coalesce(f.fa_fpago, ''))) = 'S'
       and coalesce(f.fa_codfpago, 0) = 1
  ), acumulados as (
    select c.*, sum(c.valor) over (order by c.orden)::numeric as acumulado from candidatos c
  ), corte as (
    select a.orden from acumulados a order by abs(a.acumulado - p_monto), a.orden limit 1
  ), seleccion as (
    select a.* from acumulados a where a.orden <= coalesce((select orden from corte), 0)
  )
  select coalesce(array_agg(s.factura order by s.orden), array[]::text[]),
         count(*)::integer, coalesce(sum(s.valor), 0)::numeric
    into v_codigos, v_cantidad, v_total
    from seleccion s;

  if v_cantidad = 0 then
    raise exception 'No hay conduces pagados en efectivo disponibles.' using errcode = 'P0001';
  end if;

  update myappdb.factura f
     set fa_status = 'U'
   where btrim(f.fa_codempr::text) = v_empresa
     and f.fa_codsucu = p_sucursal
     and f.fa_codfact::text = any(v_codigos)
     and upper(btrim(coalesce(f.fa_status, ''))) = 'C'
     and upper(btrim(coalesce(f.fa_fpago, ''))) = 'S'
     and coalesce(f.fa_codfpago, 0) = 1;

  get diagnostics v_actualizadas = row_count;
  if v_actualizadas <> v_cantidad then
    raise exception 'No se actualizaron todos los conduces seleccionados.' using errcode = '40001';
  end if;

  return jsonb_build_object(
    'cantidad', v_actualizadas,
    'suma_seleccionada', v_total,
    'monto_solicitado', p_monto,
    'balance', p_monto - v_total,
    'facturas', to_jsonb(v_codigos)
  );
end;
$$;

revoke all on function myappdb.plataforma_preparar_pendiente(text, integer, numeric) from public, anon;
revoke all on function myappdb.plataforma_confirmar_pendiente(text, integer, numeric) from public, anon;
grant execute on function myappdb.plataforma_preparar_pendiente(text, integer, numeric) to authenticated;
grant execute on function myappdb.plataforma_confirmar_pendiente(text, integer, numeric) to authenticated;

notify pgrst, 'reload schema';
