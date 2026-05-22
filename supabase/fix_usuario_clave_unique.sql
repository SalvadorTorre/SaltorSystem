BEGIN;

-- Si existe como constraint UNIQUE
ALTER TABLE myappdb.usuario
  DROP CONSTRAINT IF EXISTS idx_30136_claveusuario;

-- Si existe como índice UNIQUE
DROP INDEX IF EXISTS myappdb.idx_30136_claveusuario;

-- Opcional: dejar índice normal (no unique) para búsquedas
CREATE INDEX IF NOT EXISTS idx_30136_claveusuario_idx
  ON myappdb.usuario (claveusuario);

COMMIT;
