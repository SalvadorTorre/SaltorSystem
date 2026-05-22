-- Preparacion minima para usar Supabase Auth con la tabla myappdb.usuario
-- Ejecutar una vez en SQL Editor (rol con permisos de DDL).

BEGIN;

ALTER TABLE myappdb.usuario
  ADD COLUMN IF NOT EXISTS auth_user_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'usuario_auth_user_id_fkey'
      AND conrelid = 'myappdb.usuario'::regclass
  ) THEN
    ALTER TABLE myappdb.usuario
      ADD CONSTRAINT usuario_auth_user_id_fkey
      FOREIGN KEY (auth_user_id)
      REFERENCES auth.users (id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_usuario_auth_user_id
  ON myappdb.usuario (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

COMMIT;



SUPABASE_URL="https://dslfmrecdeckuwhlhbsw.supabase.co" \
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzbGZtcmVjZGVja3V3aGxoYnN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDczMTk4MywiZXhwIjoyMDkwMzA3OTgzfQ.q7aWJiAfKuQr6qIaovizNABRHVESdD03yK3mRLSzMHs" \
APP_SCHEMA="myappdb" \
ROOT_USERNAME="eliuortega" \
ROOT_PASSWORD="1807" \
ROOT_EMAIL="eliuortega@saltorsystem.local" \
ROOT_NAME="eliuortega" \
node supabase/create_root_user.mjs
