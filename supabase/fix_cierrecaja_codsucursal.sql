DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'myappdb'
      AND table_name = 'cierrecaja'
      AND column_name = 'codsucural'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'myappdb'
      AND table_name = 'cierrecaja'
      AND column_name = 'codsucursal'
  ) THEN
    ALTER TABLE myappdb.cierrecaja RENAME COLUMN codsucural TO codsucursal;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'myappdb'
      AND table_name = 'cierrecaja'
      AND column_name = 'codsucursal'
  ) THEN
    ALTER TABLE myappdb.cierrecaja ADD COLUMN codsucursal bigint;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
