-- Ejecutar en Supabase SQL Editor.
-- Reserva y asigna un ENCF a una factura desde la app movil.
-- Si la factura ya tiene ENCF, devuelve el existente sin consumir secuencia.

begin;

create or replace function myappdb.mobile_asignar_encf_factura(
  p_codigo text
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
  v_factura myappdb.factura%rowtype;
  v_encf myappdb.encf%rowtype;
  v_tipo text := '';
  v_desde bigint := 1;
  v_count bigint := 0;
  v_siguiente bigint := 0;
begin
  if v_codigo = '' then
    raise exception 'Debe indicar la factura para generar el ENCF.';
  end if;

  if v_auth_user_id is not null then
    select coalesce(u.cod_empre, '')
      into v_cod_empre
    from myappdb.usuario u
    where u.auth_user_id = v_auth_user_id
    limit 1;
  end if;

  select *
    into v_factura
  from myappdb.factura f
  where (
          f.fa_codfact = v_codigo
          or f.fa_ncffact = v_codigo
        )
    and (
          v_cod_empre = ''
          or coalesce(f.fa_codempr, '') = v_cod_empre
        )
  limit 1
  for update;

  if not found then
    raise exception 'No se encontro la factura % para generar el ENCF.', v_codigo;
  end if;

  if btrim(coalesce(v_factura.fa_ncffact, '')) <> '' then
    return jsonb_build_object(
      'fa_codfact', v_factura.fa_codfact,
      'fa_ncffact', v_factura.fa_ncffact,
      'existing', true
    );
  end if;

  if v_factura.fa_tiponcf is null then
    raise exception 'La factura no tiene tipo de comprobante para generar ENCF.';
  end if;

  select *
    into v_encf
  from myappdb.encf e
  where coalesce(e.codempr, '') = coalesce(v_factura.fa_codempr, '')
    and (
          e.tipo = v_factura.fa_tiponcf
          or upper(btrim(coalesce(e.tipoencf, ''))) =
             (case when v_factura.fa_tiponcf >= 31 then 'E' else 'B' end) ||
             lpad(v_factura.fa_tiponcf::text, 2, '0')
        )
  order by e.id desc
  limit 1
  for update;

  if not found then
    raise exception 'No hay secuencia ENCF configurada para la empresa % y el tipo %.',
      v_factura.fa_codempr,
      v_factura.fa_tiponcf;
  end if;

  v_tipo := upper(btrim(coalesce(v_encf.tipoencf, '')));
  if v_tipo = '' then
    v_tipo :=
      (case when v_factura.fa_tiponcf >= 31 then 'E' else 'B' end) ||
      lpad(v_factura.fa_tiponcf::text, 2, '0');
  end if;

  v_desde := greatest(coalesce(v_encf.desdeencf, 1)::bigint, 1);
  v_count := greatest(coalesce(v_encf.countencf, 0)::bigint, 0);
  v_siguiente := v_desde + v_count;

  if coalesce(v_encf.hastaencf, 0) > 0
     and v_siguiente > v_encf.hastaencf then
    raise exception 'La secuencia % alcanzo su limite (%).',
      v_tipo,
      v_encf.hastaencf;
  end if;

  if coalesce(v_encf.cantencf, 0) > 0
     and v_count >= v_encf.cantencf then
    raise exception 'La secuencia % no tiene disponibilidad.', v_tipo;
  end if;

  update myappdb.encf
     set countencf = v_count + 1
   where id = v_encf.id;

  update myappdb.factura
     set fa_ncffact = v_tipo || lpad(v_siguiente::text, 10, '0'),
         fa_fecncf = current_date
   where fa_codfact = v_factura.fa_codfact
  returning *
    into v_factura;

  return jsonb_build_object(
    'fa_codfact', v_factura.fa_codfact,
    'fa_ncffact', v_factura.fa_ncffact,
    'existing', false
  );
end;
$$;

create or replace function public.mobile_asignar_encf_factura(
  p_codigo text
)
returns jsonb
language sql
security definer
set search_path = myappdb, public
as $$
  select myappdb.mobile_asignar_encf_factura(p_codigo);
$$;

grant execute on function myappdb.mobile_asignar_encf_factura(text)
to authenticated;

grant execute on function public.mobile_asignar_encf_factura(text)
to authenticated;

commit;

notify pgrst, 'reload schema';
