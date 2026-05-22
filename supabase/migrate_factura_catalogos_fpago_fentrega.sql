-- Asegura catalogos minimos para facturacion en myappdb:
-- 1) Formas de pago DGII (fpago)
-- 2) Formas de entrega (fentrega)

BEGIN;

-- ----------------------------
-- fpago (catalogo DGII)
-- ----------------------------
ALTER TABLE myappdb.fpago
  ADD COLUMN IF NOT EXISTS dgii_codigo smallint;

ALTER TABLE myappdb.fpago
  ADD COLUMN IF NOT EXISTS es_dgii boolean NOT NULL DEFAULT true;

ALTER TABLE myappdb.fpago
  ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;

INSERT INTO myappdb.fpago (fp_codfpago, fp_descfpago, dgii_codigo, es_dgii, activo)
VALUES
  (1, 'Efectivo', 1, true, true),
  (2, 'Cheque/Transferencia/Deposito', 2, true, true),
  (3, 'Tarjeta de Debito/Credito', 3, true, true),
  (4, 'Venta a Credito', 4, true, true),
  (5, 'Bonos o Certificados de regalo', 5, true, true),
  (6, 'Permuta', 6, true, true),
  (7, 'Nota de Credito', 7, true, true),
  (8, 'Otras Formas de pago', 8, true, true)
ON CONFLICT (fp_codfpago)
DO UPDATE
SET
  fp_descfpago = EXCLUDED.fp_descfpago,
  dgii_codigo = EXCLUDED.dgii_codigo,
  es_dgii = EXCLUDED.es_dgii,
  activo = EXCLUDED.activo;

UPDATE myappdb.fpago
SET dgii_codigo = fp_codfpago
WHERE dgii_codigo IS NULL;

UPDATE myappdb.fpago
SET
  es_dgii = COALESCE(es_dgii, true),
  activo = COALESCE(activo, true)
WHERE fp_codfpago BETWEEN 1 AND 8;

SELECT setval(
  'myappdb.fpago_fp_codfpago_seq',
  (
    SELECT GREATEST(COALESCE(MAX(fp_codfpago), 1), 8)
    FROM myappdb.fpago
  ),
  true
);

-- ----------------------------
-- fentrega (catalogo para fa_envio)
-- ----------------------------
INSERT INTO myappdb.fentrega (idfentrega, desentrega)
VALUES
  (1, 'Envio'),
  (2, 'Retira Cliente')
ON CONFLICT (idfentrega)
DO UPDATE
SET desentrega = EXCLUDED.desentrega;

SELECT setval(
  'myappdb.fentrega_idfentrega_seq',
  (
    SELECT GREATEST(COALESCE(MAX(idfentrega), 1), 2)
    FROM myappdb.fentrega
  ),
  true
);

COMMIT;
