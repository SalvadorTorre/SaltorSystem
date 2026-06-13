-- Ambiente DGII por empresa.
-- El certificado y el endpoint base siguen siendo globales; TEST/PROD se decide por empresa.

BEGIN;

CREATE TABLE IF NOT EXISTS myappdb.configuracion_dgii_empresa (
  cod_empre varchar(30) PRIMARY KEY REFERENCES myappdb.empresas(cod_empre) ON UPDATE CASCADE ON DELETE CASCADE,
  dgii_ambiente varchar(10) NOT NULL DEFAULT 'test',
  activo boolean NOT NULL DEFAULT true,
  notas text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by varchar(80),
  CONSTRAINT chk_configuracion_dgii_empresa_ambiente
    CHECK (lower(dgii_ambiente) IN ('test', 'prod'))
);

CREATE INDEX IF NOT EXISTS idx_configuracion_dgii_empresa_ambiente
  ON myappdb.configuracion_dgii_empresa (dgii_ambiente, activo);

CREATE OR REPLACE FUNCTION myappdb.set_configuracion_dgii_empresa_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.dgii_ambiente = lower(trim(COALESCE(NEW.dgii_ambiente, 'test')));
  NEW.updated_at = now();
  NEW.updated_by = COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    NEW.updated_by,
    current_user
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_configuracion_dgii_empresa_updated_at
ON myappdb.configuracion_dgii_empresa;

CREATE TRIGGER trg_configuracion_dgii_empresa_updated_at
BEFORE INSERT OR UPDATE ON myappdb.configuracion_dgii_empresa
FOR EACH ROW
EXECUTE FUNCTION myappdb.set_configuracion_dgii_empresa_updated_at();

INSERT INTO myappdb.configuracion_dgii_empresa (cod_empre, dgii_ambiente, activo, notas)
SELECT e.cod_empre, 'test', true, 'Inicializado automaticamente'
FROM myappdb.empresas e
WHERE NOT EXISTS (
  SELECT 1
  FROM myappdb.configuracion_dgii_empresa cfg
  WHERE cfg.cod_empre = e.cod_empre
);

ALTER TABLE myappdb.configuracion_dgii_empresa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS configuracion_dgii_empresa_select_auth
ON myappdb.configuracion_dgii_empresa;
CREATE POLICY configuracion_dgii_empresa_select_auth
ON myappdb.configuracion_dgii_empresa
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS configuracion_dgii_empresa_insert_auth
ON myappdb.configuracion_dgii_empresa;
CREATE POLICY configuracion_dgii_empresa_insert_auth
ON myappdb.configuracion_dgii_empresa
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS configuracion_dgii_empresa_update_auth
ON myappdb.configuracion_dgii_empresa;
CREATE POLICY configuracion_dgii_empresa_update_auth
ON myappdb.configuracion_dgii_empresa
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON TABLE myappdb.configuracion_dgii_empresa TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE myappdb.configuracion_dgii_empresa TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
