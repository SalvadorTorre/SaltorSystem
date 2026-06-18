-- Permite que la app movil de chofer abra la factura completa cuando la
-- factura esta asignada en salida/detsalida al chofer autenticado.
-- Sin este ajuste el RPC puede mostrar la salida, pero el SELECT directo
-- sobre factura/detfactura queda oculto por RLS y la app muestra
-- "Factura no encontrada".

BEGIN;

CREATE OR REPLACE FUNCTION app_private.current_driver_has_invoice(
  _invoice_code text,
  _company text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = myappdb, public
AS $$
DECLARE
  cu RECORD;
  v_invoice text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO cu FROM app_private.current_usuario() LIMIT 1;
  IF cu IS NULL THEN
    RETURN false;
  END IF;

  v_invoice := btrim(coalesce(_invoice_code, ''));
  IF v_invoice = '' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM myappdb.detsalida d
    JOIN myappdb.salida s
      ON s.codsalida = d.codsalida
    JOIN myappdb.factura f
      ON f.fa_codfact = d.codfact
    WHERE d.codfact = v_invoice
      AND coalesce(d.status, '') = 'P'
      AND coalesce(s.status, '') = 'P'
      AND s.codchofer = cu.codusuario
      AND (
        coalesce(cu.cod_empre, '') = ''
        OR coalesce(_company, '') = ''
        OR upper(coalesce(_company, '')) = upper(coalesce(cu.cod_empre, ''))
      )
    LIMIT 1
  );
END;
$$;

REVOKE ALL ON FUNCTION app_private.current_driver_has_invoice(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.current_driver_has_invoice(text, text) TO authenticated;

DROP POLICY IF EXISTS factura_select_permiso ON myappdb.factura;

CREATE POLICY factura_select_permiso
ON myappdb.factura
FOR SELECT TO authenticated
USING (
  (
    app_private.current_usuario_tenant_ok(fa_codempr::text, fa_codsucu::text)
    AND (
      app_private.has_any_permission(
        '[
          {"recurso":"facturacion.factura","accion":"ver"},
          {"recurso":"caja.cobrofact","accion":"ver"},
          {"recurso":"contabilidad.facturas_pendientes","accion":"ver"},
          {"recurso":"despacho.main","accion":"ver"},
          {"recurso":"despacho.main","accion":"imprimir"}
        ]'::jsonb,
        fa_codempr::text,
        fa_codsucu::text
      )
      OR app_private.current_role_label() LIKE '%desp%'
      OR app_private.current_role_label() LIKE '%forja%'
    )
  )
  OR app_private.current_driver_has_invoice(fa_codfact::text, fa_codempr::text)
);

DROP POLICY IF EXISTS detfactura_select_permiso ON myappdb.detfactura;

CREATE POLICY detfactura_select_permiso
ON myappdb.detfactura
FOR SELECT TO authenticated
USING (
  (
    app_private.current_usuario_tenant_ok(df_codepr::text, df_codsucu::text)
    AND (
      app_private.has_any_permission(
        '[
          {"recurso":"facturacion.factura","accion":"ver"},
          {"recurso":"caja.cobrofact","accion":"ver"},
          {"recurso":"almacen.controlfact","accion":"ver"},
          {"recurso":"despacho.main","accion":"ver"},
          {"recurso":"despacho.main","accion":"imprimir"}
        ]'::jsonb,
        df_codepr::text,
        df_codsucu::text
      )
      OR app_private.current_role_label() LIKE '%desp%'
      OR app_private.current_role_label() LIKE '%forja%'
    )
  )
  OR app_private.current_driver_has_invoice(df_codfact::text, df_codepr::text)
);

NOTIFY pgrst, 'reload schema';

COMMIT;
