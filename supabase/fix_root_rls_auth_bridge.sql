-- Corrige el puente Auth -> myappdb.usuario para que ROOT/COMPUTOS no quede
-- bloqueado por RLS cuando auth_user_id no fue sincronizado.
--
-- Ejecutar en el SQL editor del Supabase self-hosted.

BEGIN;

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO authenticated, anon;

ALTER TABLE IF EXISTS myappdb.usuario
  ADD COLUMN IF NOT EXISTS auth_user_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'usuario_auth_user_id_fkey'
      AND conrelid = 'myappdb.usuario'::regclass
  ) THEN
    ALTER TABLE myappdb.usuario
      ADD CONSTRAINT usuario_auth_user_id_fkey
      FOREIGN KEY (auth_user_id)
      REFERENCES auth.users(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_usuario_auth_user_id
  ON myappdb.usuario (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- Backfill robusto para usuarios existentes en Auth.
UPDATE myappdb.usuario u
SET auth_user_id = au.id
FROM auth.users au
WHERE u.auth_user_id IS NULL
  AND (
    lower(coalesce(u.correo, '')) = lower(coalesce(au.email, ''))
    OR lower(coalesce(u.idusuario, '') || '@saltorsystem.local') = lower(coalesce(au.email, ''))
    OR lower(coalesce(u.idusuario, '') || '@usuario.saltorsystem.local') = lower(coalesce(au.email, ''))
  );

CREATE OR REPLACE FUNCTION app_private._norm_role(_txt text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT translate(lower(coalesce(_txt, '')), 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU');
$$;

CREATE OR REPLACE FUNCTION app_private.current_usuario()
RETURNS TABLE (
  codusuario int,
  idusuario text,
  idtipousuario int,
  cod_empre text,
  sucursalid int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = myappdb, public
AS $$
  WITH auth_ctx AS (
    SELECT
      auth.uid() AS uid,
      lower(coalesce(auth.jwt()->>'email', '')) AS email
  )
  SELECT
    u.codusuario,
    u.idusuario::text,
    u.idtipousuario,
    u.cod_empre::text,
    u.sucursalid
  FROM myappdb.usuario u
  CROSS JOIN auth_ctx a
  WHERE a.uid IS NOT NULL
    AND (
      u.auth_user_id = a.uid
      OR lower(coalesce(u.correo, '')) = a.email
      OR lower(coalesce(u.idusuario, '') || '@saltorsystem.local') = a.email
      OR lower(coalesce(u.idusuario, '') || '@usuario.saltorsystem.local') = a.email
    )
  ORDER BY
    CASE WHEN u.auth_user_id = a.uid THEN 0 ELSE 1 END,
    u.codusuario
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app_private.current_role_label()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = myappdb, public
AS $$
  SELECT app_private._norm_role(t.descripcion)
  FROM app_private.current_usuario() cu
  LEFT JOIN myappdb.tipousuario t ON t.id = cu.idtipousuario
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app_private.is_root()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = myappdb, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app_private.current_usuario() cu
    WHERE
      cu.idtipousuario = 1
      OR app_private.current_role_label() LIKE '%root%'
      OR app_private.current_role_label() LIKE '%super%'
      OR app_private.current_role_label() LIKE '%computo%'
      OR app_private.current_role_label() LIKE '%sistema%'
      OR app_private.current_role_label() LIKE '%gerente%'
  );
$$;

CREATE OR REPLACE FUNCTION app_private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = myappdb, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app_private.current_usuario() cu
    WHERE
      cu.idtipousuario IN (2, 9)
      OR app_private.current_role_label() LIKE '%admin%'
      OR app_private.current_role_label() LIKE '%cajero%'
      OR app_private.current_role_label() LIKE '%cajera%'
      OR app_private.current_role_label() LIKE '%caja%'
      OR app_private.current_role_label() LIKE '%cobro%'
  );
$$;

REVOKE ALL ON FUNCTION app_private.current_usuario() FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.current_role_label() FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.is_root() FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.is_admin() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION app_private.current_usuario() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.current_role_label() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_root() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_admin() TO authenticated;

-- Policies explicitas para tablas de permisos: ROOT/ADMIN administra todo,
-- usuarios autenticados pueden leer catalogos activos.
ALTER TABLE IF EXISTS myappdb.permiso_accion_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS myappdb.permiso_recurso_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS myappdb.permiso_recurso_accion_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS myappdb.usuario_permiso_accion ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS myappdb.tipousuario_permiso_accion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS permiso_accion_catalogo_select_auth ON myappdb.permiso_accion_catalogo;
DROP POLICY IF EXISTS permiso_accion_catalogo_root_all ON myappdb.permiso_accion_catalogo;
CREATE POLICY permiso_accion_catalogo_select_auth
ON myappdb.permiso_accion_catalogo
FOR SELECT TO authenticated
USING (activo = true OR app_private.is_root() OR app_private.is_admin());
CREATE POLICY permiso_accion_catalogo_root_all
ON myappdb.permiso_accion_catalogo
FOR ALL TO authenticated
USING (app_private.is_root() OR app_private.is_admin())
WITH CHECK (app_private.is_root() OR app_private.is_admin());

DROP POLICY IF EXISTS permiso_recurso_catalogo_select_auth ON myappdb.permiso_recurso_catalogo;
DROP POLICY IF EXISTS permiso_recurso_catalogo_root_all ON myappdb.permiso_recurso_catalogo;
CREATE POLICY permiso_recurso_catalogo_select_auth
ON myappdb.permiso_recurso_catalogo
FOR SELECT TO authenticated
USING (activo = true OR app_private.is_root() OR app_private.is_admin());
CREATE POLICY permiso_recurso_catalogo_root_all
ON myappdb.permiso_recurso_catalogo
FOR ALL TO authenticated
USING (app_private.is_root() OR app_private.is_admin())
WITH CHECK (app_private.is_root() OR app_private.is_admin());

DROP POLICY IF EXISTS permiso_recurso_accion_catalogo_select_auth ON myappdb.permiso_recurso_accion_catalogo;
DROP POLICY IF EXISTS permiso_recurso_accion_catalogo_root_all ON myappdb.permiso_recurso_accion_catalogo;
CREATE POLICY permiso_recurso_accion_catalogo_select_auth
ON myappdb.permiso_recurso_accion_catalogo
FOR SELECT TO authenticated
USING (activo = true OR app_private.is_root() OR app_private.is_admin());
CREATE POLICY permiso_recurso_accion_catalogo_root_all
ON myappdb.permiso_recurso_accion_catalogo
FOR ALL TO authenticated
USING (app_private.is_root() OR app_private.is_admin())
WITH CHECK (app_private.is_root() OR app_private.is_admin());

DROP POLICY IF EXISTS usuario_permiso_accion_root_all ON myappdb.usuario_permiso_accion;
CREATE POLICY usuario_permiso_accion_root_all
ON myappdb.usuario_permiso_accion
FOR ALL TO authenticated
USING (app_private.is_root() OR app_private.is_admin())
WITH CHECK (app_private.is_root() OR app_private.is_admin());

DROP POLICY IF EXISTS tipousuario_permiso_accion_root_all ON myappdb.tipousuario_permiso_accion;
CREATE POLICY tipousuario_permiso_accion_root_all
ON myappdb.tipousuario_permiso_accion
FOR ALL TO authenticated
USING (app_private.is_root() OR app_private.is_admin())
WITH CHECK (app_private.is_root() OR app_private.is_admin());

COMMIT;

-- Diagnostico para ejecutar logueado como ROOT desde SQL/API:
-- SELECT * FROM app_private.current_usuario();
-- SELECT app_private.current_role_label(), app_private.is_root(), app_private.is_admin();
