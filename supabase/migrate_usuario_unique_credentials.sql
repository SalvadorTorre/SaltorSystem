-- Migracion: impedir claves y codigos de usuario duplicados en myappdb.usuario

BEGIN;

-- Normalizar vacios a NULL para permitir indice parcial limpio
UPDATE myappdb.usuario
SET idusuario = NULL
WHERE idusuario IS NOT NULL
  AND btrim(idusuario) = '';

UPDATE myappdb.usuario
SET claveusuario = NULL
WHERE claveusuario IS NOT NULL
  AND btrim(claveusuario) = '';

DO $$
DECLARE
  dup_id_count int;
  dup_clave_count int;
BEGIN
  SELECT COUNT(*) INTO dup_id_count
  FROM (
    SELECT lower(btrim(idusuario)) AS key_norm
    FROM myappdb.usuario
    WHERE idusuario IS NOT NULL
      AND btrim(idusuario) <> ''
    GROUP BY 1
    HAVING COUNT(*) > 1
  ) t;

  IF dup_id_count > 0 THEN
    RAISE EXCEPTION 'Hay % codigos de usuario duplicados (idusuario). Corrige esos duplicados antes de aplicar esta migracion.', dup_id_count;
  END IF;

  SELECT COUNT(*) INTO dup_clave_count
  FROM (
    SELECT btrim(claveusuario) AS key_norm
    FROM myappdb.usuario
    WHERE claveusuario IS NOT NULL
      AND btrim(claveusuario) <> ''
    GROUP BY 1
    HAVING COUNT(*) > 1
  ) t;

  IF dup_clave_count > 0 THEN
    RAISE EXCEPTION 'Hay % claves de usuario duplicadas (claveusuario). Corrige esos duplicados antes de aplicar esta migracion.', dup_clave_count;
  END IF;
END$$;

-- Limpiar indices/constraints previos de claveusuario
ALTER TABLE myappdb.usuario
  DROP CONSTRAINT IF EXISTS idx_30136_claveusuario;

DROP INDEX IF EXISTS myappdb.idx_30136_claveusuario_idx;
DROP INDEX IF EXISTS myappdb.idx_30136_claveusuario;
DROP INDEX IF EXISTS myappdb.ux_usuario_claveusuario;
DROP INDEX IF EXISTS myappdb.ux_usuario_idusuario_norm;

-- Regla 1: la clave de usuario no puede repetirse
CREATE UNIQUE INDEX ux_usuario_claveusuario
  ON myappdb.usuario (claveusuario)
  WHERE claveusuario IS NOT NULL
    AND btrim(claveusuario) <> '';

-- Regla 2: el codigo/login del usuario no puede repetirse (case-insensitive)
CREATE UNIQUE INDEX ux_usuario_idusuario_norm
  ON myappdb.usuario ((lower(btrim(idusuario))))
  WHERE idusuario IS NOT NULL
    AND btrim(idusuario) <> '';

COMMIT;
