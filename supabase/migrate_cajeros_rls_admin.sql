-- Permite que los usuarios tipo CAJEROS vean las facturas de su empresa en Caja.
-- Antes solo idtipousuario=2 o descripcion ADMIN pasaban como admin para RLS.
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

REVOKE ALL ON FUNCTION app_private.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.is_admin() TO authenticated;
