-- Ejecutar en Supabase SQL Editor.
-- Repara el modulo movil de choferes despues de migraciones/RLS.
-- Devuelve salidas por chofer aunque el SELECT directo sobre salida/detsalida
-- este bloqueado por RLS, y soporta facturas relacionadas por:
--   detsalida.codsalida = salida.codsalida
--   factura.idsalida = salida.codsalida
--   factura.idsalida = salida.id

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
          with detalles as (
            select
              d.idsalida::text as idsalida,
              d.idsucursal::text as idsucursal,
              d.codsalida::text as codsalida,
              d.codfact::text as codfact,
              d.fecfact::text as fecfact,
              d.nomclie::text as nomclie,
              d.valfact::text as valfact,
              d.codchofer::text as codchofer,
              d.nomchofer::text as nomchofer,
              d.valabono::text as valabono,
              d.devolucion::text as devolucion,
              d.valdevolucion::text as valdevolucion,
              d.entregada::text as entregada,
              d.pagado::text as pagado,
              d.status::text as status,
              d.imp::text as imp,
              f.fa_fpago::text as fa_fpago,
              f.fa_entrega::text as fa_entrega
            from myappdb.detsalida d
            left join myappdb.factura f
              on f.fa_codfact = d.codfact
            where d.codsalida = s.codsalida
              and (
                v_cod_empre = ''
                or coalesce(f.fa_codempr, '') = v_cod_empre
                or f.fa_codfact is null
              )

            union all

            select
              null::text as idsalida,
              s.idsucursal::text as idsucursal,
              s.codsalida::text as codsalida,
              f.fa_codfact::text as codfact,
              f.fa_fecfact::text as fecfact,
              f.fa_nomclie::text as nomclie,
              f.fa_valfact::text as valfact,
              s.codchofer::text as codchofer,
              s.nomchofer::text as nomchofer,
              f.fa_abofact::text as valabono,
              null::text as devolucion,
              null::text as valdevolucion,
              f.fa_entrega::text as entregada,
              f.fa_fpago::text as pagado,
              f.fa_status::text as status,
              null::text as imp,
              f.fa_fpago::text as fa_fpago,
              f.fa_entrega::text as fa_entrega
            from myappdb.factura f
            where trim(coalesce(f.idsalida::text, '')) in (
                trim(coalesce(s.codsalida::text, '')),
                trim(coalesce(s.id::text, ''))
              )
              and not exists (
                select 1
                from myappdb.detsalida d2
                where d2.codsalida = s.codsalida
                  and d2.codfact = f.fa_codfact
              )
              and (
                v_cod_empre = ''
                or coalesce(f.fa_codempr, '') = v_cod_empre
              )
          )
          select jsonb_agg(
            jsonb_build_object(
              'idsalida', detalles.idsalida,
              'idsucursal', detalles.idsucursal,
              'codsalida', detalles.codsalida,
              'codfact', detalles.codfact,
              'fecfact', detalles.fecfact,
              'nomclie', detalles.nomclie,
              'valfact', detalles.valfact,
              'codchofer', detalles.codchofer,
              'nomchofer', detalles.nomchofer,
              'valabono', detalles.valabono,
              'devolucion', detalles.devolucion,
              'valdevolucion', detalles.valdevolucion,
              'entregada', detalles.entregada,
              'pagado', detalles.pagado,
              'fa_fpago', detalles.fa_fpago,
              'fa_entrega', detalles.fa_entrega,
              'status', detalles.status,
              'imp', detalles.imp
            )
            order by detalles.codfact
          )
          from detalles
        ), '[]'::jsonb)
      )
      order by s.fecsalida desc nulls last, s.id desc
    )
    from myappdb.salida s
    where s.codchofer = v_codchofer
      and upper(trim(coalesce(s.status::text, ''))) = 'P'
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
