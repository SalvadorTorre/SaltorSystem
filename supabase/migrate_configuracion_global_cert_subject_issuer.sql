-- Agrega campos para persistir Titular (CN) y Emisor (CN)
-- Ejecutar en proyectos donde configuracion_global ya exista.

ALTER TABLE myappdb.configuracion_global
  ADD COLUMN IF NOT EXISTS certificado_subject_cn varchar(255),
  ADD COLUMN IF NOT EXISTS certificado_issuer_cn varchar(255);
