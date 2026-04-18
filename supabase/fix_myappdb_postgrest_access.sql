-- Ejecutar en Supabase SQL Editor.
-- Objetivo: exponer myappdb en REST (PostgREST) y habilitar acceso para frontend en desarrollo.
-- Nota: en producción debes reemplazar esto por políticas RLS por tenant (empresa/sucursal).

BEGIN;

-- 1) Exponer schema al API REST
ALTER ROLE authenticator SET pgrst.db_schemas = 'public,graphql_public,myappdb';
ALTER ROLE authenticator SET pgrst.db_extra_search_path = 'public,extensions,myappdb';

-- 2) Permisos base
GRANT USAGE ON SCHEMA myappdb TO anon, authenticated, service_role;

-- 3) Permisos de tablas/secuencias para frontend (DEV)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA myappdb TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA myappdb TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA myappdb
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA myappdb
GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;

-- 4) Mantener service_role con control total para scripts/admin
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA myappdb TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA myappdb TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA myappdb TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA myappdb
GRANT ALL PRIVILEGES ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA myappdb
GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA myappdb
GRANT ALL PRIVILEGES ON FUNCTIONS TO service_role;

-- 5) DEV ONLY: apagar RLS en todas las tablas del schema
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

-- 6) Recargar PostgREST (fuera de transacción)
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

-- 7) Verificaciones rápidas
-- SELECT rolname, rolconfig FROM pg_roles WHERE rolname = 'authenticator';
-- SELECT grantee, table_schema, table_name, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE table_schema = 'myappdb' AND grantee IN ('anon','authenticated')
-- ORDER BY table_name, privilege_type;
