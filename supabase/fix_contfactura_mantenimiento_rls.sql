-- Correccion directa para permitir insertar/editar contfactura desde
-- /private/mantenimientos/contfactura.
--
-- Si seguia saliendo "new row violates row-level security policy", era porque
-- la politica INSERT no estaba pasando con el rol/sesion actual. Este script
-- limpia todas las politicas de contfactura y deja acceso al cliente de la app.

ALTER TABLE IF EXISTS myappdb.contfactura ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE myappdb.contfactura TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE myappdb.contfactura_id_seq TO anon, authenticated, service_role;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'myappdb'
      AND tablename = 'contfactura'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON myappdb.contfactura', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY contfactura_app_select
ON myappdb.contfactura
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY contfactura_app_insert
ON myappdb.contfactura
FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY contfactura_app_update
ON myappdb.contfactura
FOR UPDATE TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY contfactura_app_delete
ON myappdb.contfactura
FOR DELETE TO anon, authenticated
USING (true);
