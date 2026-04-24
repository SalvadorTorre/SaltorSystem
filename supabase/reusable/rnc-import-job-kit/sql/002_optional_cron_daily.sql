-- OPCIONAL: Programar importacion diaria via pg_cron + pg_net
--
-- Requiere que tu proyecto tenga disponibles las extensiones:
--   - pg_cron
--   - pg_net
--
-- Importante: reemplaza <PROJECT_REF>, <ANON_KEY> y <APP_SCHEMA>.

-- 1) Programar job diario a las 2:00 AM
SELECT cron.schedule(
  'rnc_import_daily_2am',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/rnc-import-job',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', '<ANON_KEY>',
      'Authorization', 'Bearer <ANON_KEY>'
    ),
    body := jsonb_build_object(
      'action', 'start',
      'schema', '<APP_SCHEMA>',
      'requestedBy', 'cron'
    )
  );
  $$
);

-- 2) Ver jobs programados
-- SELECT * FROM cron.job ORDER BY jobid DESC;

-- 3) Borrar cron por nombre
-- SELECT cron.unschedule(jobid)
-- FROM cron.job
-- WHERE jobname = 'rnc_import_daily_2am';
