-- Configuración global para firma digital y DGII (aplica a todas las empresas)
-- Schema único del proyecto: myappdb

CREATE TABLE IF NOT EXISTS myappdb.configuracion_global (
  id smallint PRIMARY KEY DEFAULT 1,
  logo_data_url text,
  logo_nombre varchar(255),
  certificado_nombre varchar(255),
  certificado_p12_base64 text,
  certificado_password varchar(255),
  certificado_vence date,
  certificado_subject_cn varchar(255),
  certificado_issuer_cn varchar(255),
  dgii_base_url varchar(255) NOT NULL DEFAULT 'https://ecf-propio.tail2c2b0a.ts.net/ecf',
  dgii_ambiente varchar(10) NOT NULL DEFAULT 'test',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by varchar(60)
);

ALTER TABLE myappdb.configuracion_global
  ADD COLUMN IF NOT EXISTS certificado_subject_cn varchar(255),
  ADD COLUMN IF NOT EXISTS certificado_issuer_cn varchar(255),
  ADD COLUMN IF NOT EXISTS dgii_ambiente varchar(10);

UPDATE myappdb.configuracion_global
SET dgii_ambiente = COALESCE(NULLIF(lower(trim(dgii_ambiente)), ''), 'test')
WHERE dgii_ambiente IS DISTINCT FROM COALESCE(NULLIF(lower(trim(dgii_ambiente)), ''), 'test');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_configuracion_global_singleton'
      AND conrelid = 'myappdb.configuracion_global'::regclass
  ) THEN
    ALTER TABLE myappdb.configuracion_global
      ADD CONSTRAINT chk_configuracion_global_singleton CHECK (id = 1);
  END IF;

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

INSERT INTO myappdb.configuracion_global (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

GRANT SELECT, INSERT, UPDATE ON myappdb.configuracion_global TO anon;
GRANT SELECT, INSERT, UPDATE ON myappdb.configuracion_global TO authenticated;
GRANT SELECT, INSERT, UPDATE ON myappdb.configuracion_global TO service_role;
