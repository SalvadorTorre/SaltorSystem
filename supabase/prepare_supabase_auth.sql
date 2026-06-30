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
-- Para crear/sincronizar usuarios Auth usa variables de entorno fuera del frontend.
-- No guardes SUPABASE_SERVICE_KEY ni DATABASE_URL dentro del codigo del cliente.
-- Ejemplo:
-- SUPABASE_URL="https://saltor-supabase.tail67c2f6.ts.net" \
-- SUPABASE_SERVICE_KEY="<service-role-key>" \
-- APP_SCHEMA="myappdb" \
-- node supabase/create_root_user.mjs
