-- Agrega ambiente DGII (test/prod) en configuración global
-- Para proyectos donde myappdb.configuracion_global ya existe.

ALTER TABLE myappdb.configuracion_global
  ADD COLUMN IF NOT EXISTS dgii_ambiente varchar(10);

UPDATE myappdb.configuracion_global
SET dgii_ambiente = COALESCE(NULLIF(lower(trim(dgii_ambiente)), ''), 'test')
WHERE dgii_ambiente IS DISTINCT FROM COALESCE(NULLIF(lower(trim(dgii_ambiente)), ''), 'test');

ALTER TABLE myappdb.configuracion_global
  ALTER COLUMN dgii_ambiente SET DEFAULT 'test';

ALTER TABLE myappdb.configuracion_global
  ALTER COLUMN dgii_ambiente SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_configuracion_global_dgii_ambiente'
      AND conrelid = 'myappdb.configuracion_global'::regclass
  ) THEN
    ALTER TABLE myappdb.configuracion_global
      ADD CONSTRAINT chk_configuracion_global_dgii_ambiente
      CHECK (lower(dgii_ambiente) IN ('test', 'prod'));
  END IF;
END $$;
