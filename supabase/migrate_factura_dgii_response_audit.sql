-- Auditoria completa de respuestas DGII por factura.
-- Permite diagnosticar rechazos, aceptados condicionales y payloads enviados.

BEGIN;

ALTER TABLE myappdb.factura
  ADD COLUMN IF NOT EXISTS dgii_request_json jsonb,
  ADD COLUMN IF NOT EXISTS dgii_response_json jsonb,
  ADD COLUMN IF NOT EXISTS dgii_response_raw jsonb,
  ADD COLUMN IF NOT EXISTS dgii_mensajes jsonb,
  ADD COLUMN IF NOT EXISTS dgii_error_message text,
  ADD COLUMN IF NOT EXISTS dgii_track_id text,
  ADD COLUMN IF NOT EXISTS dgii_codigo text,
  ADD COLUMN IF NOT EXISTS dgii_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_factura_dgii_estado
  ON myappdb.factura (estado_envio_dgii, estado_dgii);

CREATE INDEX IF NOT EXISTS idx_factura_dgii_tipo_fecha
  ON myappdb.factura (fa_tiponcf, fa_fecfact);

CREATE INDEX IF NOT EXISTS idx_factura_dgii_response_gin
  ON myappdb.factura USING gin (dgii_response_json);

NOTIFY pgrst, 'reload schema';

COMMIT;
