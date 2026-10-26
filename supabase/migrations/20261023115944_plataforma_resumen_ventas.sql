-- Resumen global de ventas para el dueño de la Plataforma.
-- Agrupa por día (hasta 7 días), semana (hasta 31 días) o mes.

begin;

create or replace function myappdb.plataforma_resumen_ventas(
  p_empresa text default null,
  p_sucursal integer default null,
  p_fecha_desde date default current_date,
  p_fecha_hasta date default current_date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_empresa text := nullif(btrim(coalesce(p_empresa, '')), '');
  v_dias integer;
  v_agrupacion text;
  v_resultado jsonb;
begin
  if not app_private.es_dueno_plataforma() then
    raise exception 'Solo el dueño de la plataforma puede consultar estas ventas.'
      using errcode = '42501';
  end if;

  if p_fecha_desde is null or p_fecha_hasta is null then
    raise exception 'Debe indicar el período de la consulta.' using errcode = '22004';
  end if;
  if p_fecha_desde > p_fecha_hasta then
    raise exception 'La fecha inicial no puede ser mayor que la fecha final.' using errcode = '22007';
  end if;
  if p_sucursal is not null and v_empresa is null then
    raise exception 'Para filtrar una sucursal debe seleccionar una empresa.' using errcode = '22023';
  end if;
  if v_empresa is not null and not exists (
    select 1 from myappdb.empresas e where btrim(e.cod_empre::text) = v_empresa
  ) then
    raise exception 'La empresa seleccionada no existe.' using errcode = '22023';
  end if;
  if p_sucursal is not null and not exists (
    select 1
    from myappdb.sucursales s
    where btrim(s.cod_empre::text) = v_empresa
      and s.cod_sucursal = p_sucursal
  ) then
    raise exception 'La sucursal seleccionada no pertenece a la empresa.' using errcode = '22023';
  end if;

  v_dias := (p_fecha_hasta - p_fecha_desde) + 1;
  v_agrupacion := case
    when v_dias <= 7 then 'dia'
    when v_dias <= 31 then 'semana'
    else 'mes'
  end;

  with base as (
    select
      f.fa_fecfact::date as fecha,
      case
        when upper(btrim(coalesce(f.fa_status, ''))) = 'C' then 'conduce'
        when upper(btrim(coalesce(f.fa_status, ''))) = 'U' then 'pendiente'
        else 'factura'
      end as tipo,
      coalesce(f.fa_valfact, 0)::numeric as valor
    from myappdb.factura f
    where f.fa_fecfact::date between p_fecha_desde and p_fecha_hasta
      and (v_empresa is null or btrim(f.fa_codempr::text) = v_empresa)
      and (p_sucursal is null or f.fa_codsucu = p_sucursal)
      and upper(btrim(coalesce(f.fa_status, ''))) <> 'N'
  ),
  periodos as (
    select
      d::date as periodo_inicio,
      d::date as periodo_fin
    from generate_series(p_fecha_desde, p_fecha_hasta, interval '1 day') d
    where v_agrupacion = 'dia'

    union all

    select
      d::date as periodo_inicio,
      least((d + interval '6 days')::date, p_fecha_hasta) as periodo_fin
    from generate_series(p_fecha_desde, p_fecha_hasta, interval '7 days') d
    where v_agrupacion = 'semana'

    union all

    select
      greatest(d::date, p_fecha_desde) as periodo_inicio,
      least((d + interval '1 month - 1 day')::date, p_fecha_hasta) as periodo_fin
    from generate_series(
      date_trunc('month', p_fecha_desde::timestamp),
      date_trunc('month', p_fecha_hasta::timestamp),
      interval '1 month'
    ) d
    where v_agrupacion = 'mes'
  ),
  detalle as (
    select
      p.periodo_inicio,
      p.periodo_fin,
      count(b.fecha)::integer as documentos,
      count(b.fecha) filter (where b.tipo = 'factura')::integer as facturas,
      coalesce(sum(b.valor) filter (where b.tipo = 'factura'), 0)::numeric as total_facturado,
      count(b.fecha) filter (where b.tipo = 'conduce')::integer as conduces,
      coalesce(sum(b.valor) filter (where b.tipo = 'conduce'), 0)::numeric as total_conduce,
      count(b.fecha) filter (where b.tipo = 'pendiente')::integer as pendientes,
      coalesce(sum(b.valor) filter (where b.tipo = 'pendiente'), 0)::numeric as total_pendiente,
      coalesce(sum(b.valor), 0)::numeric as total_periodo
    from periodos p
    left join base b on b.fecha between p.periodo_inicio and p.periodo_fin
    group by p.periodo_inicio, p.periodo_fin
  ),
  totales as (
    select
      count(*)::integer as documentos,
      count(*) filter (where tipo = 'factura')::integer as facturas,
      coalesce(sum(valor) filter (where tipo = 'factura'), 0)::numeric as total_facturado,
      count(*) filter (where tipo = 'conduce')::integer as conduces,
      coalesce(sum(valor) filter (where tipo = 'conduce'), 0)::numeric as total_conduce,
      count(*) filter (where tipo = 'pendiente')::integer as pendientes,
      coalesce(sum(valor) filter (where tipo = 'pendiente'), 0)::numeric as total_pendiente,
      coalesce(sum(valor), 0)::numeric as total_general
    from base
  )
  select jsonb_build_object(
    'agrupacion', v_agrupacion,
    'fecha_desde', p_fecha_desde,
    'fecha_hasta', p_fecha_hasta,
    'documentos', t.documentos,
    'facturas', t.facturas,
    'total_facturado', t.total_facturado,
    'conduces', t.conduces,
    'total_conduce', t.total_conduce,
    'pendientes', t.pendientes,
    'total_pendiente', t.total_pendiente,
    'total_general', t.total_general,
    'detalle', coalesce((
      select jsonb_agg(to_jsonb(d) order by d.periodo_inicio)
      from detalle d
    ), '[]'::jsonb)
  )
  into v_resultado
  from totales t;

  return v_resultado;
end;
$$;

revoke all on function myappdb.plataforma_resumen_ventas(text, integer, date, date) from public, anon;
grant execute on function myappdb.plataforma_resumen_ventas(text, integer, date, date) to authenticated;

-- Selecciona el prefijo cronológico cuya suma queda más cerca del monto.
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
  if v_empresa is null or p_sucursal is null then
    raise exception 'Seleccione una empresa y una sucursal.' using errcode = '22023';
  end if;
  if coalesce(p_monto, 0) <= 0 then
    raise exception 'El monto debe ser mayor que cero.' using errcode = '22023';
  end if;

  with candidatos as (
    select
      row_number() over (order by f.fa_fecfact asc, f.fa_codfact asc) as orden,
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
  ),
  acumulados as (
    select c.*, sum(c.valor) over (order by c.orden)::numeric as acumulado
    from candidatos c
  ),
  corte as (
    select a.orden
    from acumulados a
    order by abs(a.acumulado - p_monto), a.orden
    limit 1
  ),
  seleccion as (
    select a.* from acumulados a
    where a.orden <= coalesce((select orden from corte), 0)
  )
  select jsonb_build_object(
    'monto_solicitado', p_monto,
    'cantidad', count(*)::integer,
    'suma_seleccionada', coalesce(sum(s.valor), 0),
    'balance', p_monto - coalesce(sum(s.valor), 0),
    'conduces', coalesce(jsonb_agg(
      jsonb_build_object(
        'factura', s.factura,
        'fecha', s.fecha,
        'cliente', s.cliente,
        'valor', s.valor,
        'acumulado', s.acumulado
      ) order by s.orden
    ) filter (where s.factura is not null), '[]'::jsonb)
  )
  into v_resultado
  from seleccion s;

  return v_resultado;
end;
$$;

-- Recalcula la misma selección bajo bloqueo y cambia los conduces a U.
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
  if v_empresa is null or p_sucursal is null then
    raise exception 'Seleccione una empresa y una sucursal.' using errcode = '22023';
  end if;
  if coalesce(p_monto, 0) <= 0 then
    raise exception 'El monto debe ser mayor que cero.' using errcode = '22023';
  end if;

  -- Impide que dos confirmaciones seleccionen simultáneamente los mismos conduces.
  perform 1
  from myappdb.factura f
  where btrim(f.fa_codempr::text) = v_empresa
    and f.fa_codsucu = p_sucursal
    and upper(btrim(coalesce(f.fa_status, ''))) = 'C'
    and upper(btrim(coalesce(f.fa_fpago, ''))) = 'S'
    and coalesce(f.fa_codfpago, 0) = 1
  order by f.fa_fecfact asc, f.fa_codfact asc
  for update;

  with candidatos as (
    select
      row_number() over (order by f.fa_fecfact asc, f.fa_codfact asc) as orden,
      f.fa_codfact::text as factura,
      coalesce(f.fa_valfact, 0)::numeric as valor
    from myappdb.factura f
    where btrim(f.fa_codempr::text) = v_empresa
      and f.fa_codsucu = p_sucursal
      and upper(btrim(coalesce(f.fa_status, ''))) = 'C'
      and upper(btrim(coalesce(f.fa_fpago, ''))) = 'S'
      and coalesce(f.fa_codfpago, 0) = 1
  ),
  acumulados as (
    select c.*, sum(c.valor) over (order by c.orden)::numeric as acumulado
    from candidatos c
  ),
  corte as (
    select a.orden
    from acumulados a
    order by abs(a.acumulado - p_monto), a.orden
    limit 1
  ),
  seleccion as (
    select a.* from acumulados a
    where a.orden <= coalesce((select orden from corte), 0)
  )
  select
    coalesce(array_agg(s.factura order by s.orden), array[]::text[]),
    count(*)::integer,
    coalesce(sum(s.valor), 0)::numeric
  into v_codigos, v_cantidad, v_total
  from seleccion s;

  if v_cantidad = 0 then
    raise exception 'No hay conduces en efectivo disponibles para crear el pendiente.' using errcode = 'P0001';
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
    raise exception 'La selección cambió durante el proceso. No se modificó ningún conduce.' using errcode = '40001';
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

-- Desde el día 6 informa los conduces que todavía permanecen en C del mes anterior.
create or replace function myappdb.plataforma_alerta_conduces_mes_anterior()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_desde date := (date_trunc('month', current_date) - interval '1 month')::date;
  v_hasta date := (date_trunc('month', current_date) - interval '1 day')::date;
  v_resultado jsonb;
begin
  if not app_private.es_dueno_plataforma() then
    raise exception 'Solo el dueño de la plataforma puede consultar esta alerta.' using errcode = '42501';
  end if;

  if extract(day from current_date)::integer <= 5 then
    return jsonb_build_object(
      'activa', false,
      'fecha_desde', v_desde,
      'fecha_hasta', v_hasta,
      'cantidad', 0,
      'total', 0,
      'detalle', '[]'::jsonb
    );
  end if;

  with pendientes as (
    select
      btrim(f.fa_codempr::text) as empresa,
      coalesce(e.nom_empre, btrim(f.fa_codempr::text))::text as nombre_empresa,
      f.fa_codsucu as sucursal,
      coalesce(s.nom_sucursal, 'Sucursal ' || f.fa_codsucu::text)::text as nombre_sucursal,
      count(*)::integer as cantidad,
      coalesce(sum(f.fa_valfact), 0)::numeric as total
    from myappdb.factura f
    left join myappdb.empresas e on btrim(e.cod_empre::text) = btrim(f.fa_codempr::text)
    left join myappdb.sucursales s
      on btrim(s.cod_empre::text) = btrim(f.fa_codempr::text)
     and s.cod_sucursal = f.fa_codsucu
    where f.fa_fecfact::date between v_desde and v_hasta
      and upper(btrim(coalesce(f.fa_status, ''))) = 'C'
      and upper(btrim(coalesce(f.fa_fpago, ''))) = 'S'
    group by btrim(f.fa_codempr::text), e.nom_empre, f.fa_codsucu, s.nom_sucursal
  )
  select jsonb_build_object(
    'activa', coalesce(sum(p.cantidad), 0) > 0,
    'fecha_desde', v_desde,
    'fecha_hasta', v_hasta,
    'cantidad', coalesce(sum(p.cantidad), 0),
    'total', coalesce(sum(p.total), 0),
    'detalle', coalesce(jsonb_agg(to_jsonb(p) order by p.nombre_empresa, p.sucursal)
      filter (where p.empresa is not null), '[]'::jsonb)
  )
  into v_resultado
  from pendientes p;

  return v_resultado;
end;
$$;

revoke all on function myappdb.plataforma_preparar_pendiente(text, integer, numeric) from public, anon;
revoke all on function myappdb.plataforma_confirmar_pendiente(text, integer, numeric) from public, anon;
revoke all on function myappdb.plataforma_alerta_conduces_mes_anterior() from public, anon;
grant execute on function myappdb.plataforma_preparar_pendiente(text, integer, numeric) to authenticated;
grant execute on function myappdb.plataforma_confirmar_pendiente(text, integer, numeric) to authenticated;
grant execute on function myappdb.plataforma_alerta_conduces_mes_anterior() to authenticated;

commit;

notify pgrst, 'reload schema';
