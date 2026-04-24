-- Job server para importacion de RNC (schema configurable)
--
-- Cambia SOLO este valor por el schema de tu proyecto:
--   v_schema := 'TU_SCHEMA';

DO $$
DECLARE
  v_schema text := 'myappdb';
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I.rnc_import_job (
      id varchar(60) PRIMARY KEY,
      status varchar(20) NOT NULL DEFAULT ''pending'',
      phase varchar(20) NOT NULL DEFAULT ''descargando'',
      processed integer NOT NULL DEFAULT 0,
      total integer NOT NULL DEFAULT 0,
      inserted integer NOT NULL DEFAULT 0,
      errors integer NOT NULL DEFAULT 0,
      message text,
      source_url text,
      requested_by varchar(80),
      schema_name varchar(40) NOT NULL DEFAULT %L,
      started_at timestamptz,
      finished_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )',
    v_schema,
    v_schema
  );

  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_rnc_import_job_created_at
     ON %I.rnc_import_job (created_at DESC)',
    v_schema
  );

  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_rnc_import_job_status
     ON %I.rnc_import_job (status)',
    v_schema
  );

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_rnc_import_job_status'
      AND conrelid = to_regclass(format('%I.rnc_import_job', v_schema))
  ) THEN
    EXECUTE format(
      'ALTER TABLE %I.rnc_import_job
       ADD CONSTRAINT chk_rnc_import_job_status
       CHECK (status IN (''pending'', ''running'', ''success'', ''error''))',
      v_schema
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_rnc_import_job_phase'
      AND conrelid = to_regclass(format('%I.rnc_import_job', v_schema))
  ) THEN
    EXECUTE format(
      'ALTER TABLE %I.rnc_import_job
       ADD CONSTRAINT chk_rnc_import_job_phase
       CHECK (phase IN (''descargando'', ''descomprimiendo'', ''parseando'', ''limpiando'', ''insertando'', ''completado''))',
      v_schema
    );
  END IF;

  EXECUTE format(
    'GRANT SELECT, INSERT, UPDATE ON %I.rnc_import_job TO service_role',
    v_schema
  );
END $$;

-- Refrescar schema cache de PostgREST para que la Edge Function vea la tabla al instante
NOTIFY pgrst, 'reload schema';
