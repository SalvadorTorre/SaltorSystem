-- Ejecutar en Supabase SQL Editor.
-- Fix puntual para que la pantalla de Tipo Usuario pueda listar y guardar.
-- Solo usa schema myappdb.

BEGIN;

GRANT USAGE ON SCHEMA myappdb TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE myappdb.tipousuario TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE myappdb.dtipousuario TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE myappdb.modulo TO anon, authenticated;

GRANT USAGE, SELECT ON SEQUENCE myappdb.tipousuario_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE myappdb.dtipousuario_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE myappdb.modulo_idmodulo_seq TO anon, authenticated;

ALTER TABLE myappdb.tipousuario DISABLE ROW LEVEL SECURITY;
ALTER TABLE myappdb.dtipousuario DISABLE ROW LEVEL SECURITY;
ALTER TABLE myappdb.modulo DISABLE ROW LEVEL SECURITY;

COMMIT;

NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

-- Verificacion recomendada:
-- SET ROLE anon;
-- SELECT COUNT(*) AS tipos_visibles FROM myappdb.tipousuario;
-- RESET ROLE;
