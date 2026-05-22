-- DEV ONLY: habilita acceso desde frontend (anon/authenticated) al schema myappdb.
-- Usar mientras migras y pruebas en modo bypass.
-- En producción debes endurecer esto con RLS por empresa/sucursal.

BEGIN;

GRANT USAGE ON SCHEMA myappdb TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA myappdb TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA myappdb TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA myappdb
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA myappdb
GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;

-- Si alguna tabla tiene RLS habilitado, la apagamos en desarrollo para evitar bloqueos.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'myappdb'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I DISABLE ROW LEVEL SECURITY', r.schemaname, r.tablename);
  END LOOP;
END $$;

COMMIT;
