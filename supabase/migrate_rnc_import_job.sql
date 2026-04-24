-- Job server para importacion de RNC (schema: myappdb)

CREATE TABLE IF NOT EXISTS myappdb.rnc_import_job (
  id varchar(60) PRIMARY KEY,
  status varchar(20) NOT NULL DEFAULT 'pending',
  phase varchar(20) NOT NULL DEFAULT 'descargando',
  processed integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  inserted integer NOT NULL DEFAULT 0,
  errors integer NOT NULL DEFAULT 0,
  message text,
  source_url text,
  requested_by varchar(80),
  schema_name varchar(40) NOT NULL DEFAULT 'myappdb',
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rnc_import_job_created_at
  ON myappdb.rnc_import_job (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rnc_import_job_status
  ON myappdb.rnc_import_job (status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_rnc_import_job_status'
      AND conrelid = 'myappdb.rnc_import_job'::regclass
  ) THEN
    ALTER TABLE myappdb.rnc_import_job
      ADD CONSTRAINT chk_rnc_import_job_status
      CHECK (status IN ('pending', 'running', 'success', 'error'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_rnc_import_job_phase'
      AND conrelid = 'myappdb.rnc_import_job'::regclass
  ) THEN
    ALTER TABLE myappdb.rnc_import_job
      ADD CONSTRAINT chk_rnc_import_job_phase
      CHECK (phase IN ('descargando', 'descomprimiendo', 'parseando', 'limpiando', 'insertando', 'completado'));
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON myappdb.rnc_import_job TO service_role;

-- Refrescar schema cache de PostgREST para que la Edge Function vea la tabla al instante
NOTIFY pgrst, 'reload schema';
