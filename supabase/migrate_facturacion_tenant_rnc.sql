-- Multi-tenant estricto para facturacion por empresa/RNC
-- Schema objetivo: myappdb

BEGIN;

ALTER TABLE myappdb.factura
  ADD COLUMN IF NOT EXISTS tenant_rnc varchar(13);

ALTER TABLE myappdb.detfactura
  ADD COLUMN IF NOT EXISTS tenant_rnc varchar(13);

-- Backfill desde empresas por codigo de empresa
UPDATE myappdb.factura f
SET tenant_rnc = e.rnc_empre
FROM myappdb.empresas e
WHERE e.cod_empre = f.fa_codempr
  AND (f.tenant_rnc IS DISTINCT FROM e.rnc_empre);

UPDATE myappdb.detfactura d
SET tenant_rnc = e.rnc_empre
FROM myappdb.empresas e
WHERE e.cod_empre = d.df_codepr
  AND (d.tenant_rnc IS DISTINCT FROM e.rnc_empre);

-- Indices de tenant
CREATE INDEX IF NOT EXISTS idx_factura_tenant_rnc ON myappdb.factura (tenant_rnc);
CREATE INDEX IF NOT EXISTS idx_factura_fa_codempr ON myappdb.factura (fa_codempr);
CREATE INDEX IF NOT EXISTS idx_detfactura_tenant_rnc ON myappdb.detfactura (tenant_rnc);
CREATE INDEX IF NOT EXISTS idx_detfactura_df_codepr ON myappdb.detfactura (df_codepr);

-- FK para evitar facturas huerfanas de empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'factura_fa_codempr_fkey'
      AND conrelid = 'myappdb.factura'::regclass
  ) THEN
    ALTER TABLE myappdb.factura
      ADD CONSTRAINT factura_fa_codempr_fkey
      FOREIGN KEY (fa_codempr)
      REFERENCES myappdb.empresas(cod_empre)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'detfactura_df_codepr_fkey'
      AND conrelid = 'myappdb.detfactura'::regclass
  ) THEN
    ALTER TABLE myappdb.detfactura
      ADD CONSTRAINT detfactura_df_codepr_fkey
      FOREIGN KEY (df_codepr)
      REFERENCES myappdb.empresas(cod_empre)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;

-- Trigger: factura.tenant_rnc se sincroniza al cambiar fa_codempr
CREATE OR REPLACE FUNCTION myappdb.sync_factura_tenant_rnc()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  SELECT e.rnc_empre INTO NEW.tenant_rnc
  FROM myappdb.empresas e
  WHERE e.cod_empre = NEW.fa_codempr
  LIMIT 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_factura_sync_tenant_rnc ON myappdb.factura;
CREATE TRIGGER trg_factura_sync_tenant_rnc
BEFORE INSERT OR UPDATE OF fa_codempr
ON myappdb.factura
FOR EACH ROW
EXECUTE FUNCTION myappdb.sync_factura_tenant_rnc();

-- Trigger: detfactura.tenant_rnc se sincroniza al cambiar df_codepr
CREATE OR REPLACE FUNCTION myappdb.sync_detfactura_tenant_rnc()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  SELECT e.rnc_empre INTO NEW.tenant_rnc
  FROM myappdb.empresas e
  WHERE e.cod_empre = NEW.df_codepr
  LIMIT 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_detfactura_sync_tenant_rnc ON myappdb.detfactura;
CREATE TRIGGER trg_detfactura_sync_tenant_rnc
BEFORE INSERT OR UPDATE OF df_codepr
ON myappdb.detfactura
FOR EACH ROW
EXECUTE FUNCTION myappdb.sync_detfactura_tenant_rnc();

COMMIT;
