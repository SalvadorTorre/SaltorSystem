-- Multi-tenant RLS base for myappdb
-- Objetivo:
-- 1) Activar RLS en tablas privadas
-- 2) Limitar acceso por empresa/sucursal
-- 3) Limitar lectura de facturas y docs de venta por vendedor (usuario normal)
-- 4) Excluir productos2 para uso global compartido

BEGIN;

-- Bridge Auth -> usuario local (por si falta en entornos viejos)
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

-- Backfill de puente auth -> usuario para cuentas existentes
UPDATE myappdb.usuario u
SET auth_user_id = au.id
FROM auth.users au
WHERE u.auth_user_id IS NULL
  AND lower(coalesce(u.correo, '')) <> ''
  AND lower(coalesce(u.correo, '')) = lower(au.email);

UPDATE myappdb.usuario u
SET auth_user_id = au.id
FROM auth.users au
WHERE u.auth_user_id IS NULL
  AND lower(coalesce(u.idusuario, '')) <> ''
  AND lower(coalesce(u.idusuario, '') || '@saltorsystem.local') = lower(au.email);

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO authenticated, anon;

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
  SELECT
    u.codusuario,
    u.idusuario::text,
    u.idtipousuario,
    u.cod_empre::text,
    u.sucursalid
  FROM myappdb.usuario u
  WHERE u.auth_user_id = auth.uid()
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
      cu.idtipousuario = 2
      OR app_private.current_role_label() LIKE '%admin%'
  );
$$;

CREATE OR REPLACE FUNCTION app_private.can_access_row(
  _company text DEFAULT NULL,
  _branch_text text DEFAULT NULL,
  _owner_idusuario text DEFAULT NULL,
  _owner_codusuario int DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = myappdb, public
AS $$
DECLARE
  cu RECORD;
  v_branch int;
  company_ok boolean;
  branch_ok boolean;
  owner_required boolean;
  owner_ok boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO cu FROM app_private.current_usuario() LIMIT 1;
  IF cu IS NULL THEN
    RETURN false;
  END IF;

  IF app_private.is_root() THEN
    RETURN true;
  END IF;

  IF _branch_text IS NULL OR btrim(_branch_text) = '' THEN
    v_branch := NULL;
  ELSE
    v_branch := NULLIF(regexp_replace(_branch_text, '[^0-9]', '', 'g'), '')::int;
  END IF;

  company_ok := (_company IS NULL OR btrim(_company) = '' OR upper(cu.cod_empre) = upper(_company));
  branch_ok := (v_branch IS NULL OR cu.sucursalid = v_branch);

  owner_required := (
    (_owner_idusuario IS NOT NULL AND btrim(_owner_idusuario) <> '')
    OR _owner_codusuario IS NOT NULL
  );

  owner_ok := (
    (_owner_idusuario IS NOT NULL AND btrim(_owner_idusuario) <> '' AND upper(cu.idusuario) = upper(_owner_idusuario))
    OR (_owner_codusuario IS NOT NULL AND cu.codusuario = _owner_codusuario)
  );

  -- Admin: toda su empresa (sin restriccion por vendedor)
  IF app_private.is_admin() THEN
    RETURN company_ok;
  END IF;

  -- Usuario normal: empresa+sucursal y, cuando aplique, solo sus propios registros
  IF owner_required THEN
    RETURN company_ok AND branch_ok AND owner_ok;
  END IF;

  RETURN company_ok AND branch_ok;
END;
$$;

REVOKE ALL ON FUNCTION app_private.current_usuario() FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.current_role_label() FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.is_root() FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.can_access_row(text, text, text, int) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION app_private.current_usuario() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.current_role_label() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_root() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.can_access_row(text, text, text, int) TO authenticated;

DO $$
DECLARE
  r RECORD;
  company_col text;
  branch_col text;
  owner_text_col text;
  owner_num_col text;
  expr_company text;
  expr_branch text;
  expr_owner_text text;
  expr_owner_num text;
  expr_using text;
  excluded_tables text[] := ARRAY[
    'productos2',   -- global compartida
    'rnc',          -- catalogo publico interno
    'fpago',
    'fentrega',
    'tiponcf',
    'tipousuario',
    'dtipousuario',
    'modulo',
    'grupomerc'
  ];
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'myappdb'
      AND tablename <> ALL(excluded_tables)
    ORDER BY tablename
  LOOP
    company_col := NULL;
    branch_col := NULL;
    owner_text_col := NULL;
    owner_num_col := NULL;

    SELECT c.column_name INTO company_col
    FROM information_schema.columns c
    WHERE c.table_schema = 'myappdb'
      AND c.table_name = r.tablename
      AND c.column_name IN ('cod_empre','fa_codempr','ct_codempr','dc_codempr','de_codempr','df_codepr','me_codempr','codempr')
    ORDER BY array_position(ARRAY['cod_empre','fa_codempr','ct_codempr','dc_codempr','de_codempr','df_codepr','me_codempr','codempr'], c.column_name)
    LIMIT 1;

    SELECT c.column_name INTO branch_col
    FROM information_schema.columns c
    WHERE c.table_schema = 'myappdb'
      AND c.table_name = r.tablename
      AND c.column_name IN ('sucursalid','fa_codsucu','ct_cod_sucu','dc_codsucu','de_codsucu','df_codsucu','me_codsucu','inv_codsucu','idsucursal','cl_codsucursal')
    ORDER BY array_position(ARRAY['sucursalid','fa_codsucu','ct_cod_sucu','dc_codsucu','de_codsucu','df_codsucu','me_codsucu','inv_codsucu','idsucursal','cl_codsucursal'], c.column_name)
    LIMIT 1;

    SELECT c.column_name INTO owner_text_col
    FROM information_schema.columns c
    WHERE c.table_schema = 'myappdb'
      AND c.table_name = r.tablename
      AND c.column_name IN ('fa_codvend','ct_codvend','me_codvend','idusuario','fa_usuario')
    ORDER BY array_position(ARRAY['fa_codvend','ct_codvend','me_codvend','idusuario','fa_usuario'], c.column_name)
    LIMIT 1;

    SELECT c.column_name INTO owner_num_col
    FROM information_schema.columns c
    WHERE c.table_schema = 'myappdb'
      AND c.table_name = r.tablename
      AND c.column_name = 'codusuario'
    LIMIT 1;

    expr_company := CASE WHEN company_col IS NULL THEN 'NULL' ELSE format('%I::text', company_col) END;
    expr_branch := CASE WHEN branch_col IS NULL THEN 'NULL' ELSE format('%I::text', branch_col) END;
    expr_owner_text := CASE WHEN owner_text_col IS NULL THEN 'NULL' ELSE format('%I::text', owner_text_col) END;
    expr_owner_num := CASE WHEN owner_num_col IS NULL THEN 'NULL' ELSE format('%I', owner_num_col) END;

    expr_using := format(
      'app_private.can_access_row(%s, %s, %s, %s)',
      expr_company,
      expr_branch,
      expr_owner_text,
      expr_owner_num
    );

    EXECUTE format('ALTER TABLE myappdb.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    EXECUTE format('DROP POLICY IF EXISTS rls_select_tenant ON myappdb.%I', r.tablename);
    EXECUTE format('DROP POLICY IF EXISTS rls_insert_tenant ON myappdb.%I', r.tablename);
    EXECUTE format('DROP POLICY IF EXISTS rls_update_tenant ON myappdb.%I', r.tablename);
    EXECUTE format('DROP POLICY IF EXISTS rls_delete_tenant ON myappdb.%I', r.tablename);

    EXECUTE format(
      'CREATE POLICY rls_select_tenant ON myappdb.%I FOR SELECT TO authenticated USING (%s)',
      r.tablename,
      expr_using
    );
    EXECUTE format(
      'CREATE POLICY rls_insert_tenant ON myappdb.%I FOR INSERT TO authenticated WITH CHECK (%s)',
      r.tablename,
      expr_using
    );
    EXECUTE format(
      'CREATE POLICY rls_update_tenant ON myappdb.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
      r.tablename,
      expr_using,
      expr_using
    );
    EXECUTE format(
      'CREATE POLICY rls_delete_tenant ON myappdb.%I FOR DELETE TO authenticated USING (%s)',
      r.tablename,
      expr_using
    );
  END LOOP;
END $$;

-- Vista global de productos compartidos (sin RLS)
ALTER TABLE IF EXISTS myappdb.productos2 DISABLE ROW LEVEL SECURITY;

COMMIT;

-- Validaciones rápidas sugeridas:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname='myappdb' ORDER BY tablename;
-- SELECT schemaname, tablename, policyname, cmd, roles FROM pg_policies WHERE schemaname='myappdb' ORDER BY tablename, policyname;
