begin;

-- Una vez que un comprobante empezo a enviarse, nunca se reclama otra vez de
-- forma automatica. Si el worker desaparece, queda en VERIFICAR para consultar
-- su estado en DGII antes de autorizar cualquier reenvio manual.
create or replace function myappdb.reclamar_cola_dgii(p_limite integer default 1)
returns setof myappdb.cola_dgii
language plpgsql
security definer
set search_path = pg_catalog, myappdb
as $$
declare
  v_worker uuid := gen_random_uuid();
begin
  update myappdb.cola_dgii
  set estado = 'VERIFICAR',
      bloqueado_hasta = null,
      procesado_en = coalesce(procesado_en, now()),
      actualizado_en = now(),
      ultimo_error = coalesce(
        nullif(ultimo_error, ''),
        'El proceso no termino. Verifique el estado en DGII antes de reenviar.'
      )
  where estado = 'PROCESANDO'
    and actualizado_en < now() - interval '10 minutes';

  -- Solo puede existir un envio activo en todo el sistema.
  if exists (
    select 1
    from myappdb.cola_dgii
    where estado = 'PROCESANDO'
  ) then
    return;
  end if;

  return query
  with candidata as (
    select q.id
    from myappdb.cola_dgii q
    where q.estado = 'PENDIENTE'
      and q.proximo_intento <= now()
      and q.intentos = 0
    order by q.proximo_intento, q.id
    for update skip locked
    limit 1
  )
  update myappdb.cola_dgii q
  set estado = 'PROCESANDO',
      intentos = 1,
      bloqueado_hasta = null,
      worker_id = v_worker,
      actualizado_en = now()
  from candidata c
  where q.id = c.id
  returning q.*;
end;
$$;

revoke all on function myappdb.reclamar_cola_dgii(integer) from public, anon, authenticated;
grant execute on function myappdb.reclamar_cola_dgii(integer) to service_role;

-- Los reintentos automaticos anteriores son ambiguos: la DGII pudo recibir el
-- documento aunque la respuesta no llegara. Se detienen para evitar duplicados.
update myappdb.cola_dgii
set estado = 'VERIFICAR',
    bloqueado_hasta = null,
    procesado_en = coalesce(procesado_en, now()),
    actualizado_en = now(),
    ultimo_error = coalesce(
      nullif(ultimo_error, ''),
      'Verifique el estado en DGII antes de reenviar.'
    )
where estado in ('PROCESANDO', 'REINTENTO');

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'procesar-cola-dgii';
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'procesar-cola-dgii',
    '* * * * *',
    $job$
      select net.http_post(
        url := 'https://saltor-supabase.tail67c2f6.ts.net/functions/v1/procesar-cola-facturas',
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := '{"limite":1}'::jsonb,
        timeout_milliseconds := 120000
      );
    $job$
  );
end $$;

commit;

notify pgrst, 'reload schema';
