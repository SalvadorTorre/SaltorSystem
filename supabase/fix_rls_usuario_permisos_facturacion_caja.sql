-- RLS por permisos reales de usuario para facturacion/caja.
--
-- Problema que corrige:
-- Las pantallas guardan permisos en myappdb.usuario_permiso_accion, pero las
-- policies viejas solo validaban tenant/root y en factura trataban fa_codvend
-- como dueno. Si fa_codvend guarda codigo de vendedor y no idusuario, un
-- vendedor con permiso visual podia recibir "row-level security policy".

BEGIN;

CREATE SCHEMA IF NOT EXISTS app_private;

-- Mantener el catalogo de permisos alineado con las pantallas actuales.
INSERT INTO myappdb.permiso_accion_catalogo (accion_key, descripcion, orden, activo) VALUES
  ('ver', 'Ver/consultar', 10, true),
  ('crear', 'Crear registros', 20, true),
  ('editar', 'Editar registros', 30, true),
  ('eliminar', 'Eliminar registros', 40, true),
  ('imprimir', 'Imprimir comprobantes/reportes', 50, true),
  ('exportar', 'Exportar datos', 60, true),
  ('aprobar', 'Aprobar procesos', 70, true),
  ('anular', 'Anular documentos', 80, true),
  ('enviar_dgii', 'Enviar a DGII', 90, true),
  ('cobrar', 'Cobrar facturas/recibos', 100, true),
  ('cerrar_caja', 'Ejecutar cierre de caja', 110, true),
  ('configurar', 'Cambiar configuraciones sensibles', 120, true)
ON CONFLICT (accion_key) DO UPDATE
SET descripcion = EXCLUDED.descripcion,
    orden = EXCLUDED.orden,
    activo = EXCLUDED.activo;

INSERT INTO myappdb.permiso_recurso_catalogo
(modulo_key, modulo_nombre, recurso_key, pantalla_nombre, ruta, activo, requiere_tenant, orden)
VALUES
  ('facturacion','Facturacion','facturacion.factura','Facturacion','/private/facturacion',true,true,20),
  ('contabilidad','Contabilidad','contabilidad.facturas_pendientes','Facturas pendientes','/private/contabilidad/facturas-pendientes',true,true,50),
  ('caja','Caja','caja.cobrofact','Cobro factura','/private/caja/CobroFact',true,true,70),
  ('caja','Caja','caja.controlsalida','Control salida','/private/caja/ControlSalida',true,true,71),
  ('caja','Caja','caja.cuadrecaja','Cuadre de caja','/private/caja/cuadrecaja',true,true,72),
  ('caja','Caja','caja.reciboingreso','Recibo ingreso','/private/caja/reciboingreso',true,true,73),
  ('contabilidad','Contabilidad','contabilidad.reporte_607','Reporte 607','/private/contabilidad/reporte-607',true,true,138)
ON CONFLICT (recurso_key) DO UPDATE
SET modulo_key = EXCLUDED.modulo_key,
    modulo_nombre = EXCLUDED.modulo_nombre,
    pantalla_nombre = EXCLUDED.pantalla_nombre,
    ruta = EXCLUDED.ruta,
    activo = EXCLUDED.activo,
    requiere_tenant = EXCLUDED.requiere_tenant,
    orden = EXCLUDED.orden;

INSERT INTO myappdb.permiso_recurso_accion_catalogo(recurso_key, accion_key, activo)
VALUES
  ('facturacion.factura', 'ver', true),
  ('facturacion.factura', 'crear', true),
  ('facturacion.factura', 'editar', true),
  ('facturacion.factura', 'anular', true),
  ('facturacion.factura', 'imprimir', true),
  ('facturacion.factura', 'exportar', true),
  ('facturacion.factura', 'enviar_dgii', true),
  ('contabilidad.facturas_pendientes', 'ver', true),
  ('caja.cobrofact', 'ver', true),
  ('caja.cobrofact', 'cobrar', true),
  ('caja.cobrofact', 'editar', true),
  ('caja.cobrofact', 'anular', true),
  ('caja.cobrofact', 'imprimir', true),
  ('caja.cobrofact', 'enviar_dgii', true),
  ('caja.controlsalida', 'ver', true),
  ('caja.controlsalida', 'imprimir', true),
  ('caja.controlsalida', 'exportar', true),
  ('caja.cuadrecaja', 'ver', true),
  ('caja.cuadrecaja', 'imprimir', true),
  ('caja.cuadrecaja', 'exportar', true),
  ('caja.cuadrecaja', 'cerrar_caja', true),
  ('caja.reciboingreso', 'ver', true),
  ('caja.reciboingreso', 'crear', true),
  ('caja.reciboingreso', 'editar', true),
  ('caja.reciboingreso', 'cobrar', true),
  ('caja.reciboingreso', 'anular', true),
  ('caja.reciboingreso', 'imprimir', true),
  ('contabilidad.reporte_607', 'ver', true),
  ('contabilidad.reporte_607', 'imprimir', true),
  ('contabilidad.reporte_607', 'exportar', true)
ON CONFLICT (recurso_key, accion_key) DO UPDATE SET activo = EXCLUDED.activo;

CREATE OR REPLACE FUNCTION app_private.current_usuario_tenant_ok(
  _company text DEFAULT NULL,
  _branch_text text DEFAULT NULL
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

  RETURN company_ok AND branch_ok;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.has_permission(
  _recurso_key text,
  _accion_key text,
  _company text DEFAULT NULL,
  _branch_text text DEFAULT NULL
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
  explicit_allowed boolean;
  legacy_allowed boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF app_private.is_root() OR app_private.is_admin() THEN
    RETURN true;
  END IF;

  SELECT * INTO cu FROM app_private.current_usuario() LIMIT 1;
  IF cu IS NULL THEN
    RETURN false;
  END IF;

  IF NOT app_private.current_usuario_tenant_ok(_company, _branch_text) THEN
    RETURN false;
  END IF;

  IF _branch_text IS NULL OR btrim(_branch_text) = '' THEN
    v_branch := NULL;
  ELSE
    v_branch := NULLIF(regexp_replace(_branch_text, '[^0-9]', '', 'g'), '')::int;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM myappdb.usuario_permiso_accion upa
    WHERE upa.codusuario = cu.codusuario
      AND upa.recurso_key = _recurso_key
      AND upa.accion_key = _accion_key
      AND upa.permitido = true
      AND upa.activo = true
      AND (upa.vigencia_desde IS NULL OR upa.vigencia_desde <= current_date)
      AND (upa.vigencia_hasta IS NULL OR upa.vigencia_hasta >= current_date)
      AND (
        upa.cod_empre IS NULL
        OR btrim(upa.cod_empre) = ''
        OR upper(upa.cod_empre) = upper(cu.cod_empre)
        OR upper(upa.cod_empre) = upper(coalesce(_company, ''))
      )
      AND (
        upa.sucursalid IS NULL
        OR upa.sucursalid = cu.sucursalid
        OR (v_branch IS NOT NULL AND upa.sucursalid = v_branch)
      )
    LIMIT 1
  ) INTO explicit_allowed;

  IF explicit_allowed THEN
    RETURN true;
  END IF;

  -- Fallback legacy:
  -- Si el usuario aun no tiene filas en usuario_permiso_accion, respetar el
  -- permiso heredado desde su tipo de usuario (dtipousuario + modulo).
  -- Esto evita que vendedores con acceso a Facturacion/Caja queden bloqueados
  -- por RLS mientras se termina la migracion de permisos v2.
  legacy_allowed := EXISTS (
    SELECT 1
    FROM myappdb.dtipousuario dt
    JOIN myappdb.modulo m
      ON m.idmodulo = dt.idmodulo
    WHERE dt.idtipousuario = cu.idtipousuario
      AND (
        (
          _recurso_key LIKE 'facturacion.%'
          AND (
            translate(lower(coalesce(m.descmodulo, '')), 'áéíóúñ', 'aeioun') LIKE '%factur%'
            OR translate(lower(coalesce(m.descmodulo, '')), 'áéíóúñ', 'aeioun') LIKE '%venta%'
          )
        )
        OR (
          _recurso_key LIKE 'caja.%'
          AND (
            translate(lower(coalesce(m.descmodulo, '')), 'áéíóúñ', 'aeioun') LIKE '%caja%'
            OR translate(lower(coalesce(m.descmodulo, '')), 'áéíóúñ', 'aeioun') LIKE '%cobro%'
          )
        )
      )
      AND (
        CASE
          WHEN lower(coalesce(_accion_key, '')) = 'ver'
            THEN upper(coalesce(dt.acceso, 'N')) = 'S' OR upper(coalesce(dt.lectura, 'N')) = 'S'
          ELSE
            upper(coalesce(dt.acceso, 'N')) = 'S' AND upper(coalesce(dt.lectura, 'N')) <> 'S'
        END
      )
    LIMIT 1
  );

  RETURN legacy_allowed;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.has_any_permission(
  _checks jsonb,
  _company text DEFAULT NULL,
  _branch_text text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = myappdb, public
AS $$
DECLARE
  item jsonb;
BEGIN
  IF app_private.is_root() OR app_private.is_admin() THEN
    RETURN true;
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(coalesce(_checks, '[]'::jsonb))
  LOOP
    IF app_private.has_permission(
      item->>'recurso',
      item->>'accion',
      _company,
      _branch_text
    ) THEN
      RETURN true;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION app_private.current_usuario_tenant_ok(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.has_permission(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.has_any_permission(jsonb, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.current_usuario_tenant_ok(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.has_permission(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.has_any_permission(jsonb, text, text) TO authenticated;

-- FACTURA: vender, cobrar y enviar DGII segun la matriz.
ALTER TABLE IF EXISTS myappdb.factura ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_select_tenant ON myappdb.factura;
DROP POLICY IF EXISTS rls_insert_tenant ON myappdb.factura;
DROP POLICY IF EXISTS rls_update_tenant ON myappdb.factura;
DROP POLICY IF EXISTS rls_delete_tenant ON myappdb.factura;
DROP POLICY IF EXISTS factura_select_permiso ON myappdb.factura;
DROP POLICY IF EXISTS factura_insert_permiso ON myappdb.factura;
DROP POLICY IF EXISTS factura_update_permiso ON myappdb.factura;
DROP POLICY IF EXISTS factura_delete_permiso ON myappdb.factura;

CREATE POLICY factura_select_permiso
ON myappdb.factura
FOR SELECT TO authenticated
USING (
  app_private.current_usuario_tenant_ok(fa_codempr::text, fa_codsucu::text)
  AND app_private.has_any_permission(
    '[
      {"recurso":"facturacion.factura","accion":"ver"},
      {"recurso":"caja.cobrofact","accion":"ver"},
      {"recurso":"contabilidad.facturas_pendientes","accion":"ver"}
    ]'::jsonb,
    fa_codempr::text,
    fa_codsucu::text
  )
);

CREATE POLICY factura_insert_permiso
ON myappdb.factura
FOR INSERT TO authenticated
WITH CHECK (
  app_private.current_usuario_tenant_ok(fa_codempr::text, fa_codsucu::text)
  AND app_private.has_permission('facturacion.factura', 'crear', fa_codempr::text, fa_codsucu::text)
);

CREATE POLICY factura_update_permiso
ON myappdb.factura
FOR UPDATE TO authenticated
USING (
  app_private.current_usuario_tenant_ok(fa_codempr::text, fa_codsucu::text)
  AND app_private.has_any_permission(
    '[
      {"recurso":"facturacion.factura","accion":"editar"},
      {"recurso":"facturacion.factura","accion":"enviar_dgii"},
      {"recurso":"caja.cobrofact","accion":"cobrar"},
      {"recurso":"caja.cobrofact","accion":"enviar_dgii"}
    ]'::jsonb,
    fa_codempr::text,
    fa_codsucu::text
  )
)
WITH CHECK (
  app_private.current_usuario_tenant_ok(fa_codempr::text, fa_codsucu::text)
  AND app_private.has_any_permission(
    '[
      {"recurso":"facturacion.factura","accion":"editar"},
      {"recurso":"facturacion.factura","accion":"enviar_dgii"},
      {"recurso":"caja.cobrofact","accion":"cobrar"},
      {"recurso":"caja.cobrofact","accion":"enviar_dgii"}
    ]'::jsonb,
    fa_codempr::text,
    fa_codsucu::text
  )
);

CREATE POLICY factura_delete_permiso
ON myappdb.factura
FOR DELETE TO authenticated
USING (
  app_private.current_usuario_tenant_ok(fa_codempr::text, fa_codsucu::text)
  AND app_private.has_permission('facturacion.factura', 'anular', fa_codempr::text, fa_codsucu::text)
);

-- DETFACTURA: detalle de venta.
ALTER TABLE IF EXISTS myappdb.detfactura ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_select_tenant ON myappdb.detfactura;
DROP POLICY IF EXISTS rls_insert_tenant ON myappdb.detfactura;
DROP POLICY IF EXISTS rls_update_tenant ON myappdb.detfactura;
DROP POLICY IF EXISTS rls_delete_tenant ON myappdb.detfactura;
DROP POLICY IF EXISTS detfactura_select_permiso ON myappdb.detfactura;
DROP POLICY IF EXISTS detfactura_insert_permiso ON myappdb.detfactura;
DROP POLICY IF EXISTS detfactura_update_permiso ON myappdb.detfactura;
DROP POLICY IF EXISTS detfactura_delete_permiso ON myappdb.detfactura;

CREATE POLICY detfactura_select_permiso
ON myappdb.detfactura
FOR SELECT TO authenticated
USING (
  app_private.current_usuario_tenant_ok(df_codepr::text, df_codsucu::text)
  AND app_private.has_any_permission(
    '[
      {"recurso":"facturacion.factura","accion":"ver"},
      {"recurso":"caja.cobrofact","accion":"ver"},
      {"recurso":"almacen.controlfact","accion":"ver"}
    ]'::jsonb,
    df_codepr::text,
    df_codsucu::text
  )
);

CREATE POLICY detfactura_insert_permiso
ON myappdb.detfactura
FOR INSERT TO authenticated
WITH CHECK (
  app_private.current_usuario_tenant_ok(df_codepr::text, df_codsucu::text)
  AND app_private.has_permission('facturacion.factura', 'crear', df_codepr::text, df_codsucu::text)
);

CREATE POLICY detfactura_update_permiso
ON myappdb.detfactura
FOR UPDATE TO authenticated
USING (
  app_private.current_usuario_tenant_ok(df_codepr::text, df_codsucu::text)
  AND app_private.has_any_permission(
    '[
      {"recurso":"facturacion.factura","accion":"editar"},
      {"recurso":"caja.cobrofact","accion":"cobrar"}
    ]'::jsonb,
    df_codepr::text,
    df_codsucu::text
  )
)
WITH CHECK (
  app_private.current_usuario_tenant_ok(df_codepr::text, df_codsucu::text)
  AND app_private.has_any_permission(
    '[
      {"recurso":"facturacion.factura","accion":"editar"},
      {"recurso":"caja.cobrofact","accion":"cobrar"}
    ]'::jsonb,
    df_codepr::text,
    df_codsucu::text
  )
);

CREATE POLICY detfactura_delete_permiso
ON myappdb.detfactura
FOR DELETE TO authenticated
USING (
  app_private.current_usuario_tenant_ok(df_codepr::text, df_codsucu::text)
  AND app_private.has_permission('facturacion.factura', 'anular', df_codepr::text, df_codsucu::text)
);

-- CONTFACTURA: al crear facturas/cotizaciones/entradas el sistema debe avanzar contadores.
ALTER TABLE IF EXISTS myappdb.contfactura ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_select_tenant ON myappdb.contfactura;
DROP POLICY IF EXISTS rls_insert_tenant ON myappdb.contfactura;
DROP POLICY IF EXISTS rls_update_tenant ON myappdb.contfactura;
DROP POLICY IF EXISTS rls_delete_tenant ON myappdb.contfactura;
DROP POLICY IF EXISTS contfactura_select_permiso ON myappdb.contfactura;
DROP POLICY IF EXISTS contfactura_update_permiso ON myappdb.contfactura;

CREATE POLICY contfactura_select_permiso
ON myappdb.contfactura
FOR SELECT TO authenticated
USING (
  app_private.current_usuario_tenant_ok(NULL::text, idsucursal::text)
);

CREATE POLICY contfactura_update_permiso
ON myappdb.contfactura
FOR UPDATE TO authenticated
USING (
  app_private.current_usuario_tenant_ok(NULL::text, idsucursal::text)
  AND app_private.has_any_permission(
    '[
      {"recurso":"facturacion.factura","accion":"crear"},
      {"recurso":"cotizacion.gestion","accion":"crear"},
      {"recurso":"almacen.entradamerc","accion":"crear"},
      {"recurso":"almacen.ventainterna","accion":"crear"},
      {"recurso":"almacen.salidafactura","accion":"crear"}
    ]'::jsonb,
    NULL::text,
    idsucursal::text
  )
)
WITH CHECK (
  app_private.current_usuario_tenant_ok(NULL::text, idsucursal::text)
  AND app_private.has_any_permission(
    '[
      {"recurso":"facturacion.factura","accion":"crear"},
      {"recurso":"cotizacion.gestion","accion":"crear"},
      {"recurso":"almacen.entradamerc","accion":"crear"},
      {"recurso":"almacen.ventainterna","accion":"crear"},
      {"recurso":"almacen.salidafactura","accion":"crear"}
    ]'::jsonb,
    NULL::text,
    idsucursal::text
  )
);

-- RECIBOS / CIERRE DE CAJA.
ALTER TABLE IF EXISTS myappdb.recibo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_select_tenant ON myappdb.recibo;
DROP POLICY IF EXISTS rls_insert_tenant ON myappdb.recibo;
DROP POLICY IF EXISTS rls_update_tenant ON myappdb.recibo;
DROP POLICY IF EXISTS rls_delete_tenant ON myappdb.recibo;
DROP POLICY IF EXISTS recibo_all_caja_permiso ON myappdb.recibo;

CREATE POLICY recibo_all_caja_permiso
ON myappdb.recibo
FOR ALL TO authenticated
USING (
  app_private.has_any_permission(
    '[
      {"recurso":"caja.reciboingreso","accion":"ver"},
      {"recurso":"caja.reciboingreso","accion":"cobrar"},
      {"recurso":"caja.cobrofact","accion":"cobrar"}
    ]'::jsonb
  )
)
WITH CHECK (
  app_private.has_any_permission(
    '[
      {"recurso":"caja.reciboingreso","accion":"crear"},
      {"recurso":"caja.reciboingreso","accion":"cobrar"},
      {"recurso":"caja.cobrofact","accion":"cobrar"}
    ]'::jsonb
  )
);

ALTER TABLE IF EXISTS myappdb.cierrecaja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_select_tenant ON myappdb.cierrecaja;
DROP POLICY IF EXISTS rls_insert_tenant ON myappdb.cierrecaja;
DROP POLICY IF EXISTS rls_update_tenant ON myappdb.cierrecaja;
DROP POLICY IF EXISTS rls_delete_tenant ON myappdb.cierrecaja;
DROP POLICY IF EXISTS cierrecaja_all_permiso ON myappdb.cierrecaja;

CREATE POLICY cierrecaja_all_permiso
ON myappdb.cierrecaja
FOR ALL TO authenticated
USING (
  app_private.has_permission('caja.cuadrecaja', 'cerrar_caja')
)
WITH CHECK (
  app_private.has_permission('caja.cuadrecaja', 'cerrar_caja')
);

-- MIGRACION: convertir permisos legacy por tipo de usuario a permisos v2 por usuario.
-- Se enfoca en facturacion/caja para evitar bloqueos por RLS a vendedores/cajeros.
WITH legacy_seed AS (
  SELECT DISTINCT
    u.codusuario,
    NULLIF(btrim(u.cod_empre), '') AS cod_empre,
    NULLIF(u.sucursalid, 0) AS sucursalid,
    translate(lower(coalesce(m.descmodulo, '')), 'áéíóúñ', 'aeioun') AS modulo_norm,
    upper(coalesce(dt.acceso, 'N')) AS acceso,
    upper(coalesce(dt.lectura, 'N')) AS lectura
  FROM myappdb.usuario u
  JOIN myappdb.dtipousuario dt
    ON dt.idtipousuario = u.idtipousuario
  JOIN myappdb.modulo m
    ON m.idmodulo = dt.idmodulo
  WHERE u.codusuario IS NOT NULL
),
legacy_actions AS (
  SELECT codusuario, cod_empre, sucursalid, 'facturacion.factura'::varchar(80) AS recurso_key, 'ver'::varchar(50) AS accion_key
  FROM legacy_seed
  WHERE modulo_norm LIKE '%factur%' OR modulo_norm LIKE '%venta%'

  UNION ALL
  SELECT codusuario, cod_empre, sucursalid, 'facturacion.factura', accion_key
  FROM legacy_seed
  CROSS JOIN (
    VALUES ('crear'::varchar(50)), ('editar'::varchar(50)), ('imprimir'::varchar(50)), ('exportar'::varchar(50))
  ) AS acciones(accion_key)
  WHERE (modulo_norm LIKE '%factur%' OR modulo_norm LIKE '%venta%')
    AND acceso = 'S'
    AND lectura <> 'S'

  UNION ALL
  SELECT codusuario, cod_empre, sucursalid, 'contabilidad.facturas_pendientes', 'ver'
  FROM legacy_seed
  WHERE modulo_norm LIKE '%factur%' OR modulo_norm LIKE '%venta%'

  UNION ALL
  SELECT codusuario, cod_empre, sucursalid, 'caja.cobrofact', 'ver'
  FROM legacy_seed
  WHERE modulo_norm LIKE '%caja%' OR modulo_norm LIKE '%cobro%'

  UNION ALL
  SELECT codusuario, cod_empre, sucursalid, 'caja.cobrofact', accion_key
  FROM legacy_seed
  CROSS JOIN (
    VALUES ('cobrar'::varchar(50)), ('editar'::varchar(50)), ('imprimir'::varchar(50))
  ) AS acciones(accion_key)
  WHERE (modulo_norm LIKE '%caja%' OR modulo_norm LIKE '%cobro%')
    AND acceso = 'S'
    AND lectura <> 'S'

  UNION ALL
  SELECT codusuario, cod_empre, sucursalid, 'caja.controlsalida', 'ver'
  FROM legacy_seed
  WHERE modulo_norm LIKE '%caja%' OR modulo_norm LIKE '%cobro%'

  UNION ALL
  SELECT codusuario, cod_empre, sucursalid, 'caja.controlsalida', accion_key
  FROM legacy_seed
  CROSS JOIN (
    VALUES ('imprimir'::varchar(50)), ('exportar'::varchar(50))
  ) AS acciones(accion_key)
  WHERE (modulo_norm LIKE '%caja%' OR modulo_norm LIKE '%cobro%')
    AND acceso = 'S'
    AND lectura <> 'S'

  UNION ALL
  SELECT codusuario, cod_empre, sucursalid, 'caja.cuadrecaja', 'ver'
  FROM legacy_seed
  WHERE modulo_norm LIKE '%caja%' OR modulo_norm LIKE '%cobro%'

  UNION ALL
  SELECT codusuario, cod_empre, sucursalid, 'caja.cuadrecaja', accion_key
  FROM legacy_seed
  CROSS JOIN (
    VALUES ('imprimir'::varchar(50)), ('exportar'::varchar(50)), ('cerrar_caja'::varchar(50))
  ) AS acciones(accion_key)
  WHERE (modulo_norm LIKE '%caja%' OR modulo_norm LIKE '%cobro%')
    AND acceso = 'S'
    AND lectura <> 'S'

  UNION ALL
  SELECT codusuario, cod_empre, sucursalid, 'caja.reciboingreso', 'ver'
  FROM legacy_seed
  WHERE modulo_norm LIKE '%caja%' OR modulo_norm LIKE '%cobro%'

  UNION ALL
  SELECT codusuario, cod_empre, sucursalid, 'caja.reciboingreso', accion_key
  FROM legacy_seed
  CROSS JOIN (
    VALUES ('crear'::varchar(50)), ('editar'::varchar(50)), ('cobrar'::varchar(50)), ('imprimir'::varchar(50))
  ) AS acciones(accion_key)
  WHERE (modulo_norm LIKE '%caja%' OR modulo_norm LIKE '%cobro%')
    AND acceso = 'S'
    AND lectura <> 'S'
)
INSERT INTO myappdb.usuario_permiso_accion (
  codusuario,
  recurso_key,
  accion_key,
  permitido,
  cod_empre,
  sucursalid,
  activo
)
SELECT DISTINCT
  la.codusuario,
  la.recurso_key,
  la.accion_key,
  true,
  la.cod_empre,
  la.sucursalid,
  true
FROM legacy_actions la
WHERE NOT EXISTS (
  SELECT 1
  FROM myappdb.usuario_permiso_accion upa
  WHERE upa.codusuario = la.codusuario
    AND upa.recurso_key = la.recurso_key
    AND upa.accion_key = la.accion_key
    AND coalesce(upa.cod_empre, '') = coalesce(la.cod_empre, '')
    AND coalesce(upa.sucursalid, 0) = coalesce(la.sucursalid, 0)
);

COMMIT;

-- Validacion sugerida despues de ejecutar:
-- select app_private.current_usuario();
-- select app_private.has_permission('facturacion.factura','crear');
-- select app_private.has_permission('caja.cobrofact','cobrar');
