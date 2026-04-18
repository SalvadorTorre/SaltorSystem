-- Migracion: normalizar y sembrar tipos e-CF en myappdb.tiponcf
-- Objetivo: dejar catalogo e-CF listo para pantalla ENCF (E31, E32, E33, E34, E41, E43, E44, E45, E46, E47)

BEGIN;

-- Asegurar columnas esperadas por el frontend/servicios
ALTER TABLE myappdb.tiponcf
  ADD COLUMN IF NOT EXISTS desncf varchar(40),
  ADD COLUMN IF NOT EXISTS tipo varchar(4),
  ADD COLUMN IF NOT EXISTS codigo varchar(4);

-- Semilla canonica de tipos e-CF DGII
WITH seed(tipo, codigo, desncf) AS (
  VALUES
    ('E31', '31', 'Factura de Credito Fiscal Electronica'),
    ('E32', '32', 'Factura de Consumo Electronica'),
    ('E33', '33', 'Nota de Debito Electronica'),
    ('E34', '34', 'Nota de Credito Electronica'),
    ('E41', '41', 'Comprobante de Compras Electronico'),
    ('E43', '43', 'Gastos Menores Electronico'),
    ('E44', '44', 'Regimenes Especiales Electronico'),
    ('E45', '45', 'Comprobante Gubernamental Electronico'),
    ('E46', '46', 'Comprobante de Exportacion Electronico'),
    ('E47', '47', 'Pago al Exterior Electronico')
)
INSERT INTO myappdb.tiponcf (tipo, codigo, desncf)
SELECT s.tipo, s.codigo, s.desncf
FROM seed s
ON CONFLICT (tipo, codigo)
DO UPDATE SET
  desncf = EXCLUDED.desncf;

-- Eliminar duplicados funcionales por tipo/codigo dejando el menor idncf
DELETE FROM myappdb.tiponcf t
USING myappdb.tiponcf d
WHERE t.idncf > d.idncf
  AND t.tipo = d.tipo
  AND COALESCE(t.codigo, '') = COALESCE(d.codigo, '');

COMMIT;
