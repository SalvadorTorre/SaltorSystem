-- Ejecutar en Supabase SQL Editor.
-- Agrega fa_fpago y fa_entrega de factura al RPC de salidas de chofer
-- para mostrar: Pend. Pago, Fact. Pagada o Fact. Entregada.

begin;

create or replace function myappdb.mobile_fetch_salidas_chofer(
  p_codchofer integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = myappdb, public
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_codusuario integer := null;
  v_cod_empre text := '';
  v_codchofer integer := null;
begin
  if v_auth_user_id is not null then
    select u.codusuario, coalesce(u.cod_empre, '')
      into v_codusuario, v_cod_empre
    from myappdb.usuario u
    where u.auth_user_id = v_auth_user_id
    limit 1;
  end if;

  v_codchofer := coalesce(p_codchofer, v_codusuario);

  if v_codchofer is null then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'idsucursal', s.idsucursal,
        'codsalida', s.codsalida,
        'fecsalida', s.fecsalida,
        'horasalida', s.horasalida,
        'canfact', s.canfact,
        'valfact', s.valfact,
        'valpagado', s.valpagado,
        'valdevolucion', s.valdevolucion,
        'codchofer', s.codchofer,
        'nomchofer', s.nomchofer,
        'cedchofer', s.cedchofer,
        'status', s.status,
        'envia', s.envia,
        'idusuario', s.idusuario,
        'details',
        coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'idsalida', d.idsalida,
              'idsucursal', d.idsucursal,
              'codsalida', d.codsalida,
              'codfact', d.codfact,
              'fecfact', d.fecfact,
              'nomclie', d.nomclie,
              'valfact', d.valfact,
              'codchofer', d.codchofer,
              'nomchofer', d.nomchofer,
              'valabono', d.valabono,
              'devolucion', d.devolucion,
              'valdevolucion', d.valdevolucion,
              'entregada', d.entregada,
              'pagado', d.pagado,
              'fa_fpago', f.fa_fpago,
              'fa_entrega', f.fa_entrega,
              'status', d.status,
              'imp', d.imp
            )
            order by d.codfact
          )
          from myappdb.detsalida d
          left join myappdb.factura f
            on f.fa_codfact = d.codfact
          where d.codsalida = s.codsalida
            and coalesce(d.status, '') = 'P'
            and (
              v_cod_empre = ''
              or coalesce(f.fa_codempr, '') = v_cod_empre
            )
        ), '[]'::jsonb)
      )
      order by s.fecsalida desc nulls last, s.id desc
    )
    from myappdb.salida s
    where s.codchofer = v_codchofer
      and coalesce(s.status, '') = 'P'
      and (
        v_cod_empre = ''
        or exists (
          select 1
          from myappdb.detsalida d
          join myappdb.factura f
            on f.fa_codfact = d.codfact
          where d.codsalida = s.codsalida
            and coalesce(d.status, '') = 'P'
            and coalesce(f.fa_codempr, '') = v_cod_empre
        )
      )
  ), '[]'::jsonb);
end;
$$;

create or replace function public.mobile_fetch_salidas_chofer(
  p_codchofer integer default null
)
returns jsonb
language sql
security definer
set search_path = myappdb, public
as $$
  select myappdb.mobile_fetch_salidas_chofer(p_codchofer);
$$;

grant execute on function myappdb.mobile_fetch_salidas_chofer(integer)
to authenticated;

grant execute on function public.mobile_fetch_salidas_chofer(integer)
to authenticated;

commit;

notify pgrst, 'reload schema';
