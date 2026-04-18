-- SaltorSystem / Supabase
-- Limpia todas las tablas del schema myappdb, excepto productos2.
-- Luego re-crea los tipos de usuario base: ROOT, ADMIN y VENDEDOR.

BEGIN;

DO $$
DECLARE
  truncate_sql text;
BEGIN
  SELECT 'TRUNCATE TABLE ' ||
         string_agg(format('%I.%I', schemaname, tablename), ', ') ||
         ' RESTART IDENTITY CASCADE'
    INTO truncate_sql
  FROM pg_tables
  WHERE schemaname = 'myappdb'
    AND tablename <> 'productos2';

  IF truncate_sql IS NOT NULL THEN
    EXECUTE truncate_sql;
  END IF;
END $$;

INSERT INTO myappdb.tipousuario (id, descripcion)
VALUES
  (1, 'ROOT'),
  (2, 'ADMIN'),
  (3, 'VENDEDOR')
ON CONFLICT (id) DO UPDATE
SET descripcion = EXCLUDED.descripcion;

SELECT setval(
  'myappdb.tipousuario_id_seq',
  (SELECT COALESCE(MAX(id), 1) FROM myappdb.tipousuario),
  true
);

COMMIT;
