CREATE INDEX IF NOT EXISTS idx_factura_caja_pendiente_cierre_sucursal
  ON myappdb.factura (fa_codempr, fa_codsucu, fa_codfact)
  WHERE fa_cierre IS NULL
    AND (fa_status IS NULL OR fa_status <> 'N');

CREATE INDEX IF NOT EXISTS idx_factura_caja_pendiente_cierre_estado_sucursal
  ON myappdb.factura (fa_codempr, fa_codsucu, fa_codfact)
  WHERE (fa_cierre IS NULL OR btrim(fa_cierre::text) = '' OR btrim(fa_cierre::text) IN ('0', 'N'))
    AND (fa_status IS NULL OR fa_status <> 'N');

CREATE INDEX IF NOT EXISTS idx_factura_caja_no_impresa_sucursal_fecha
  ON myappdb.factura (fa_codempr, fa_codsucu, fa_fecfact DESC, fa_codfact DESC)
  WHERE fa_impresa = 'N'
    OR (fa_impresa = 'S' AND fa_fpago = 'N')
    OR (fa_status IN ('C', 'F') AND fa_fpago = 'N');

CREATE INDEX IF NOT EXISTS idx_salida_chofer_status_sucursal
  ON myappdb.salida (idsucursal, codchofer, status, id DESC);

CREATE INDEX IF NOT EXISTS idx_detsalida_codsalida_codfact
  ON myappdb.detsalida (codsalida, codfact);

CREATE INDEX IF NOT EXISTS idx_detsalida_idsalida_codfact
  ON myappdb.detsalida (idsalida, codfact);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'myappdb'
      AND table_name = 'cierrecaja'
      AND column_name = 'codsucursal'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_cierrecaja_sucursal_ultimo
      ON myappdb.cierrecaja (codsucursal, idcierre DESC);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'myappdb'
      AND table_name = 'recibo'
      AND column_name = 'codsucu'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_recibo_sucursal_ultimo
      ON myappdb.recibo (codsucu, id DESC);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
