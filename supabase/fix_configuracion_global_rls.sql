-- Fix de acceso para pantalla de Configuración Global
-- Schema del proyecto: myappdb

-- 1) Asegura que exista la fila singleton
INSERT INTO myappdb.configuracion_global (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- 2) Garantiza permisos de tabla
GRANT SELECT, INSERT, UPDATE ON myappdb.configuracion_global TO anon;
GRANT SELECT, INSERT, UPDATE ON myappdb.configuracion_global TO authenticated;
GRANT SELECT, INSERT, UPDATE ON myappdb.configuracion_global TO service_role;

-- 3) Si RLS está activo, crear políticas explícitas para la fila global id=1
ALTER TABLE myappdb.configuracion_global ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cfg_global_select_anon ON myappdb.configuracion_global;
DROP POLICY IF EXISTS cfg_global_insert_anon ON myappdb.configuracion_global;
DROP POLICY IF EXISTS cfg_global_update_anon ON myappdb.configuracion_global;

CREATE POLICY cfg_global_select_anon
ON myappdb.configuracion_global
FOR SELECT
TO anon, authenticated
USING (id = 1);

CREATE POLICY cfg_global_insert_anon
ON myappdb.configuracion_global
FOR INSERT
TO anon, authenticated
WITH CHECK (id = 1);

CREATE POLICY cfg_global_update_anon
ON myappdb.configuracion_global
FOR UPDATE
TO anon, authenticated
USING (id = 1)
WITH CHECK (id = 1);
