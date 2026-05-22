-- Ejecutar en Supabase SQL Editor
-- Da acceso al schema myappdb para usar Data API (PostgREST) y service_role.

BEGIN;

GRANT USAGE ON SCHEMA myappdb TO anon, authenticated, service_role;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA myappdb TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA myappdb TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA myappdb TO service_role;

-- Opcional: si también quieres acceso desde anon/authenticated vía REST directo.
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA myappdb TO anon, authenticated;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA myappdb TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA myappdb
GRANT ALL PRIVILEGES ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA myappdb
GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA myappdb
GRANT ALL PRIVILEGES ON FUNCTIONS TO service_role;

COMMIT;
