-- Genera el proximo codsalida disponible revisando salida de forma global.
-- Es necesario porque salida.codsalida es unico global, pero RLS oculta
-- registros de otras sucursales al cliente.

CREATE OR REPLACE FUNCTION myappdb.next_codsalida_disponible(
  p_idsucursal integer,
  p_codsalida text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'myappdb', 'public'
AS $$
DECLARE
  v_raw text;
  v_ano integer;
  v_counter integer;
  v_contsalida integer;
  v_candidate text;
  v_attempt integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING ERRCODE = '42501';
  END IF;

  IF p_idsucursal IS NULL OR p_idsucursal <= 0 THEN
    RAISE EXCEPTION 'Sucursal invalida para generar codsalida';
  END IF;

  IF NOT app_private.current_usuario_tenant_ok(NULL::text, p_idsucursal::text) THEN
    RAISE EXCEPTION 'Sucursal no autorizada para el usuario actual' USING ERRCODE = '42501';
  END IF;

  IF NOT app_private.has_permission(
    'almacen.salidafactura',
    'crear',
    NULL::text,
    p_idsucursal::text
  ) THEN
    RAISE EXCEPTION 'Usuario sin permiso para crear salida de factura' USING ERRCODE = '42501';
  END IF;

  v_raw := regexp_replace(coalesce(p_codsalida, ''), '[^0-9]', '', 'g');
  IF length(v_raw) < 5 THEN
    RAISE EXCEPTION 'Codigo de salida invalido';
  END IF;

  v_ano := substring(v_raw from 1 for 4)::integer;
  v_counter := nullif(substring(v_raw from 5), '')::integer;

  SELECT coalesce(contsalida, 0)
    INTO v_contsalida
  FROM myappdb.contfactura
  WHERE idsucursal = p_idsucursal
  ORDER BY id
  LIMIT 1;

  v_counter := greatest(coalesce(v_counter, 0), coalesce(v_contsalida, 0) + 1, 1);

  LOOP
    v_candidate := v_ano::text || lpad(v_counter::text, 6, '0');

    IF NOT EXISTS (
      SELECT 1
      FROM myappdb.salida s
      WHERE trim(coalesce(s.codsalida, '')) = v_candidate
    ) THEN
      RETURN v_candidate;
    END IF;

    v_counter := v_counter + 1;
    v_attempt := v_attempt + 1;

    IF v_attempt >= 10000 THEN
      RAISE EXCEPTION 'No se pudo generar un codigo de salida disponible';
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION myappdb.next_codsalida_disponible(integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION myappdb.next_codsalida_disponible(integer, text) TO authenticated;
