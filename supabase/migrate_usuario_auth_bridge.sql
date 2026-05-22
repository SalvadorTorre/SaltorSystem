-- Migracion: puente entre myappdb.usuario y Supabase Auth (auth.users)

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
