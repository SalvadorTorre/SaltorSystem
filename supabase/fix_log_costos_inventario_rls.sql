-- Ejecutar en Supabase SQL Editor.
-- Corrige el error:
-- new row violates row-level security policy for table "log_costos_inventario"
--
-- La tabla se llena desde triggers al actualizar inventario. Si RLS bloquea el
-- INSERT del usuario autenticado, falla tambien el guardado de Entrada Mercancia.

BEGIN;

GRANT USAGE ON SCHEMA myappdb TO authenticated, anon;
GRANT SELECT, INSERT ON TABLE myappdb.log_costos_inventario TO authenticated;

ALTER TABLE myappdb.log_costos_inventario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS log_costos_inventario_select_auth ON myappdb.log_costos_inventario;
DROP POLICY IF EXISTS log_costos_inventario_insert_auth ON myappdb.log_costos_inventario;

CREATE POLICY log_costos_inventario_select_auth
ON myappdb.log_costos_inventario
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY log_costos_inventario_insert_auth
ON myappdb.log_costos_inventario
FOR INSERT
TO authenticated
WITH CHECK (true);

COMMIT;

NOTIFY pgrst, 'reload schema';
