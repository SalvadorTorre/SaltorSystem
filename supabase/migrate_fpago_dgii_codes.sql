-- Migracion: normalizar formas de pago DGII para e-CF en myappdb.fpago
-- Referencia oficial DGII (Formato e-CF v1.0): FormaPago codigos 1..8

BEGIN;

ALTER TABLE myappdb.fpago
  ADD COLUMN IF NOT EXISTS dgii_codigo smallint;

ALTER TABLE myappdb.fpago
  ADD COLUMN IF NOT EXISTS es_dgii boolean NOT NULL DEFAULT true;

ALTER TABLE myappdb.fpago
  ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;

-- Backfill inicial
UPDATE myappdb.fpago
SET dgii_codigo = fp_codfpago
WHERE dgii_codigo IS NULL;

-- Catalogo oficial DGII (FormaPago)
INSERT INTO myappdb.fpago (fp_codfpago, fp_descfpago, dgii_codigo, es_dgii, activo)
VALUES
  (1, 'Efectivo', 1, true, true),
  (2, 'Cheque/Transferencia/Depósito', 2, true, true),
  (3, 'Tarjeta de Débito/Crédito', 3, true, true),
  (4, 'Venta a Crédito', 4, true, true),
  (5, 'Bonos o Certificados de regalo', 5, true, true),
  (6, 'Permuta', 6, true, true),
  (7, 'Nota de crédito', 7, true, true),
  (8, 'Otras Formas de pago', 8, true, true)
ON CONFLICT (fp_codfpago)
DO UPDATE
SET
  fp_descfpago = EXCLUDED.fp_descfpago,
  dgii_codigo = EXCLUDED.dgii_codigo,
  es_dgii = true,
  activo = true;

-- Si existen facturas con codigo de pago fuera de catalogo, moverlas a 8 (Otras)
UPDATE myappdb.factura
SET
  fa_codfpago = 8,
  fa_fpago = '8'
WHERE fa_codfpago IS NOT NULL
  AND (fa_codfpago < 1 OR fa_codfpago > 8);

-- Eliminar formas de pago no oficiales
DELETE FROM myappdb.fpago
WHERE fp_codfpago < 1 OR fp_codfpago > 8;

-- Normalizar columnas nuevas
UPDATE myappdb.fpago
SET
  dgii_codigo = fp_codfpago,
  es_dgii = true,
  activo = true
WHERE fp_codfpago BETWEEN 1 AND 8;

ALTER TABLE myappdb.fpago
  DROP CONSTRAINT IF EXISTS chk_fpago_dgii_codigo_range;

ALTER TABLE myappdb.fpago
  ADD CONSTRAINT chk_fpago_dgii_codigo_range
  CHECK (dgii_codigo BETWEEN 1 AND 8);

ALTER TABLE myappdb.fpago
  DROP CONSTRAINT IF EXISTS chk_fpago_pk_range;

ALTER TABLE myappdb.fpago
  ADD CONSTRAINT chk_fpago_pk_range
  CHECK (fp_codfpago BETWEEN 1 AND 8);

DROP INDEX IF EXISTS myappdb.ux_fpago_dgii_codigo;
CREATE UNIQUE INDEX ux_fpago_dgii_codigo
  ON myappdb.fpago (dgii_codigo);

-- Ajustar secuencia para no salir de rango accidentalmente
SELECT setval(
  'myappdb.fpago_fp_codfpago_seq',
  8,
  true
);

COMMIT;
