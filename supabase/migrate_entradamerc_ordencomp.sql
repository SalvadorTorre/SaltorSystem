-- Ejecutar en Supabase SQL Editor.
-- Agrega el campo Orden Compra a la cabecera de entrada de mercancia.

ALTER TABLE myappdb.entradamerc
  ADD COLUMN IF NOT EXISTS me_ordencomp varchar(30);

-- Fuerza recarga del schema cache de PostgREST para que el frontend pueda insertar la columna.
NOTIFY pgrst, 'reload schema';
