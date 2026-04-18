-- Ejecutar en Supabase SQL Editor.
-- Objetivo: asegurar que myappdb.tipousuario tenga datos visibles para la pantalla de mantenimiento.

BEGIN;

-- 1) Diagnostico rapido (puedes correr estos SELECT por separado si quieres)
-- SELECT COUNT(*) AS myappdb_count FROM myappdb.tipousuario;
-- SELECT COUNT(*) AS public_count FROM public.tipousuario;

-- 2) Si hay datos en public.tipousuario, copiarlos a myappdb.tipousuario
DO $$
BEGIN
  IF to_regclass('public.tipousuario') IS NOT NULL THEN
    INSERT INTO myappdb.tipousuario (id, descripcion)
    SELECT p.id, p.descripcion
    FROM public.tipousuario p
    ON CONFLICT (id) DO UPDATE
      SET descripcion = EXCLUDED.descripcion;
  END IF;
END $$;

-- 3) Semilla minima si aun no hay tipos
INSERT INTO myappdb.tipousuario (id, descripcion)
SELECT 1, 'ROOT'
WHERE NOT EXISTS (SELECT 1 FROM myappdb.tipousuario WHERE id = 1);

INSERT INTO myappdb.tipousuario (id, descripcion)
SELECT 2, 'ADMIN'
WHERE NOT EXISTS (SELECT 1 FROM myappdb.tipousuario WHERE id = 2);

INSERT INTO myappdb.tipousuario (id, descripcion)
SELECT 3, 'VENDEDOR'
WHERE NOT EXISTS (SELECT 1 FROM myappdb.tipousuario WHERE id = 3);

-- 4) Ajustar secuencia
SELECT setval(
  'myappdb.tipousuario_id_seq',
  COALESCE((SELECT MAX(id) FROM myappdb.tipousuario), 1),
  true
);

COMMIT;

-- 5) Verificacion
-- SELECT id, descripcion FROM myappdb.tipousuario ORDER BY id;
