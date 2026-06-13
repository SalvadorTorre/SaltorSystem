BEGIN;

CREATE TABLE IF NOT EXISTS myappdb.cuentas_bancarias (
  id bigserial PRIMARY KEY,
  codigo varchar(30) NOT NULL,
  nombre varchar(120) NOT NULL,
  banco varchar(120) NOT NULL,
  numero_cuenta varchar(60) NOT NULL,
  tipo_cuenta varchar(30) NOT NULL DEFAULT 'CORRIENTE',
  moneda varchar(3) NOT NULL DEFAULT 'DOP',
  titular varchar(160),
  cod_empre varchar(20),
  -- NULL significa que la cuenta aplica para todas las sucursales de la empresa.
  sucursalid integer,
  es_default boolean NOT NULL DEFAULT false,
  activo boolean NOT NULL DEFAULT true,
  notas text,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  creado_por text,
  actualizado_por text,
  CONSTRAINT cuentas_bancarias_codigo_uidx UNIQUE (codigo),
  CONSTRAINT cuentas_bancarias_tipo_chk CHECK (tipo_cuenta IN ('CORRIENTE', 'AHORRO', 'TARJETA', 'OTRA')),
  CONSTRAINT cuentas_bancarias_moneda_chk CHECK (moneda IN ('DOP', 'USD', 'EUR'))
);

CREATE INDEX IF NOT EXISTS idx_cuentas_bancarias_activo
  ON myappdb.cuentas_bancarias (activo);

CREATE INDEX IF NOT EXISTS idx_cuentas_bancarias_empresa_sucursal
  ON myappdb.cuentas_bancarias (cod_empre, sucursalid);

CREATE UNIQUE INDEX IF NOT EXISTS ux_cuentas_bancarias_default_scope
  ON myappdb.cuentas_bancarias (COALESCE(cod_empre, ''), COALESCE(sucursalid, 0))
  WHERE es_default AND activo;

CREATE OR REPLACE FUNCTION myappdb.set_cuentas_bancarias_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.actualizado_en = now();
  NEW.actualizado_por = COALESCE(NULLIF(current_setting('request.jwt.claim.sub', true), ''), current_user);

  IF TG_OP = 'INSERT' THEN
    NEW.creado_por = COALESCE(NEW.creado_por, NEW.actualizado_por);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cuentas_bancarias_updated_at ON myappdb.cuentas_bancarias;
CREATE TRIGGER trg_cuentas_bancarias_updated_at
BEFORE INSERT OR UPDATE ON myappdb.cuentas_bancarias
FOR EACH ROW
EXECUTE FUNCTION myappdb.set_cuentas_bancarias_updated_at();

ALTER TABLE myappdb.cuentas_bancarias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cuentas_bancarias_select_auth ON myappdb.cuentas_bancarias;
CREATE POLICY cuentas_bancarias_select_auth
ON myappdb.cuentas_bancarias
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS cuentas_bancarias_insert_auth ON myappdb.cuentas_bancarias;
CREATE POLICY cuentas_bancarias_insert_auth
ON myappdb.cuentas_bancarias
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS cuentas_bancarias_update_auth ON myappdb.cuentas_bancarias;
CREATE POLICY cuentas_bancarias_update_auth
ON myappdb.cuentas_bancarias
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS cuentas_bancarias_delete_auth ON myappdb.cuentas_bancarias;
CREATE POLICY cuentas_bancarias_delete_auth
ON myappdb.cuentas_bancarias
FOR DELETE
TO authenticated
USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE myappdb.cuentas_bancarias TO authenticated;

DO $$
BEGIN
  IF to_regclass('myappdb.cuentas_bancarias_id_seq') IS NOT NULL THEN
    GRANT USAGE, SELECT ON SEQUENCE myappdb.cuentas_bancarias_id_seq TO authenticated;
  END IF;
END;
$$;

INSERT INTO myappdb.permiso_recurso_catalogo (
  modulo_key,
  modulo_nombre,
  recurso_key,
  pantalla_nombre,
  ruta,
  activo,
  requiere_tenant,
  orden
)
VALUES
  (
    'mantenimientos',
    'Mantenimientos',
    'mnt.cuentas_bancarias',
    'Cuentas bancarias',
    '/private/mantenimientos/cuentas-bancarias',
    true,
    true,
    132
  )
ON CONFLICT (recurso_key) DO UPDATE
SET
  modulo_key = EXCLUDED.modulo_key,
  modulo_nombre = EXCLUDED.modulo_nombre,
  pantalla_nombre = EXCLUDED.pantalla_nombre,
  ruta = EXCLUDED.ruta,
  activo = EXCLUDED.activo,
  requiere_tenant = EXCLUDED.requiere_tenant,
  orden = EXCLUDED.orden;

UPDATE myappdb.permiso_recurso_catalogo
SET ruta = '/private/mantenimientos/fpago'
WHERE recurso_key = 'mnt.fpago'
  AND ruta IS NULL;

INSERT INTO myappdb.permiso_recurso_accion_catalogo (recurso_key, accion_key, activo)
SELECT 'mnt.cuentas_bancarias', accion_key, true
FROM myappdb.permiso_accion_catalogo
WHERE accion_key IN ('ver', 'crear', 'editar', 'eliminar')
ON CONFLICT (recurso_key, accion_key) DO UPDATE
SET activo = EXCLUDED.activo;

NOTIFY pgrst, 'reload schema';

COMMIT;
