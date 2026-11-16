-- Ambiente DGII "simulado" por empresa.
--
-- Una empresa en ambiente 'simulado' NO envia nada a la DGII: el sistema
-- responde como si la DGII hubiera aceptado el comprobante (estado
-- "Aceptado", track id, codigo de seguridad y QR de simulacion). Sirve para
-- probar facturas, notas de credito, reenvios, cuadre, 607, etc. sin tocar
-- la DGII ni gastar secuencias reales en su sistema.
--
-- Se activa desde Mantenimientos > Configuracion global > Ambiente DGII por
-- empresa, eligiendo "SIMULADO". Esta migracion deja en simulado la empresa
-- "Empresa Prueba".

BEGIN;

ALTER TABLE myappdb.configuracion_dgii_empresa
  DROP CONSTRAINT IF EXISTS chk_configuracion_dgii_empresa_ambiente;

ALTER TABLE myappdb.configuracion_dgii_empresa
  ADD CONSTRAINT chk_configuracion_dgii_empresa_ambiente
  CHECK (lower(dgii_ambiente) IN ('test', 'prod', 'simulado'));

-- Empresa de prueba en simulado.
INSERT INTO myappdb.configuracion_dgii_empresa (cod_empre, dgii_ambiente, activo, notas)
SELECT e.cod_empre, 'simulado', true, 'Empresa de prueba: envios DGII simulados'
FROM myappdb.empresas e
WHERE e.nom_empre ILIKE '%empresa prueba%'
ON CONFLICT (cod_empre) DO UPDATE
  SET dgii_ambiente = 'simulado',
      activo = true,
      notas = 'Empresa de prueba: envios DGII simulados';

COMMIT;

-- Verificar cual quedo en simulado:
--   select c.cod_empre, e.nom_empre, c.dgii_ambiente
--   from myappdb.configuracion_dgii_empresa c
--   join myappdb.empresas e on e.cod_empre = c.cod_empre
--   where c.dgii_ambiente = 'simulado';

NOTIFY pgrst, 'reload schema';
