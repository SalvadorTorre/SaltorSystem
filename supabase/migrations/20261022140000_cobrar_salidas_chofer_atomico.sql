-- Control de salida (/caja/ControlSalida): cobro atomico de las salidas de un chofer.
--
-- Problemas que corrige:
--  1. Al guardar el cobro se actualizaban la salida, el detalle y las facturas
--     en pasos separados (y en paralelo). Si uno fallaba, la salida podia
--     quedar cerrada con facturas sin marcar, o al reves.
--  2. Al cerrar, las facturas seguian con fa_salida = 'S' e idsalida apuntando
--     a la salida. Si luego se cobraba una de esas facturas en Cobro de
--     factura, la salida se volvia a poner en estado 'P' y las facturas
--     reaparecian asignadas al chofer.
--
-- Ahora todo se hace en una sola transaccion: o se cierran todas las salidas
-- indicadas con sus facturas, o no se guarda nada.
--
-- Al cerrar, cada factura queda liberada de la salida:
--   fa_salida = 'C' (salida cerrada; no se puede volver a asignar a otra salida)
--   idsalida  = null
-- El historial queda en myappdb.detsalida (codsalida, codfact, pagado, status 'C').

CREATE OR REPLACE FUNCTION myappdb.cobrar_salidas_chofer(
  p_salidas jsonb,
  p_detalles jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = myappdb, public
AS $$
DECLARE
  v_salida jsonb;
  v_id integer;
  v_status text;
  v_codsalida text;
  v_codsalidas text[] := '{}';
  v_det jsonb;
  v_codfact text;
  v_det_codsalida text;
  v_pagado boolean;
  v_rows integer;
  v_total_det integer := 0;
  v_total_fact integer := 0;
  v_total_salidas integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(p_salidas) <> 'array' OR jsonb_array_length(p_salidas) = 0 THEN
    RAISE EXCEPTION 'No se indicaron salidas para cobrar.' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p_detalles) <> 'array' OR jsonb_array_length(p_detalles) = 0 THEN
    RAISE EXCEPTION 'No se indicaron facturas para cobrar.' USING ERRCODE = '22023';
  END IF;

  -- 1) Bloquear y validar cada salida. Dos cajeros cobrando la misma salida:
  --    el segundo espera aqui y luego ve que ya no esta pendiente.
  FOR v_salida IN SELECT * FROM jsonb_array_elements(p_salidas) LOOP
    v_id := nullif(v_salida->>'id', '')::integer;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Salida sin id.' USING ERRCODE = '22023';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('myappdb.salida'), v_id);

    SELECT btrim(coalesce(s.status::text, '')), btrim(coalesce(s.codsalida::text, ''))
      INTO v_status, v_codsalida
    FROM myappdb.salida s
    WHERE s.id = v_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'La salida % no existe o no tiene permiso para modificarla.', v_id
        USING ERRCODE = 'P0001';
    END IF;

    IF upper(v_status) <> 'P' THEN
      RAISE EXCEPTION 'La salida % ya no esta pendiente (estado %). Recargue la pantalla.', v_codsalida, v_status
        USING ERRCODE = 'P0001';
    END IF;

    v_codsalidas := v_codsalidas || v_codsalida;
  END LOOP;

  -- 2) Detalle de salida (historial) y factura.
  FOR v_det IN SELECT * FROM jsonb_array_elements(p_detalles) LOOP
    v_codfact := btrim(coalesce(v_det->>'codfact', ''));
    v_det_codsalida := btrim(coalesce(v_det->>'codsalida', ''));
    v_pagado := coalesce((v_det->>'pagado')::boolean, false);

    IF v_codfact = '' OR v_det_codsalida = '' THEN
      RAISE EXCEPTION 'Detalle sin factura o sin salida.' USING ERRCODE = '22023';
    END IF;

    IF NOT (v_det_codsalida = ANY (v_codsalidas)) THEN
      RAISE EXCEPTION 'La factura % pertenece a la salida %, que no se esta cobrando.', v_codfact, v_det_codsalida
        USING ERRCODE = 'P0001';
    END IF;

    UPDATE myappdb.detsalida d
       SET pagado = CASE WHEN v_pagado THEN 'S' ELSE 'N' END,
           entregada = 'S',
           status = 'C'
     WHERE btrim(d.codsalida::text) = v_det_codsalida
       AND btrim(d.codfact::text) = v_codfact;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
      RAISE EXCEPTION 'La factura % no esta en el detalle de la salida %.', v_codfact, v_det_codsalida
        USING ERRCODE = 'P0001';
    END IF;
    v_total_det := v_total_det + v_rows;

    UPDATE myappdb.factura f
       SET fa_fpago = CASE WHEN v_pagado THEN 'S' ELSE f.fa_fpago END,
           fa_entrega = 'S',
           fa_salida = 'C',
           idsalida = NULL
     WHERE f.fa_codfact::text = v_codfact;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
      RAISE EXCEPTION 'No se pudo actualizar la factura % (no existe o no tiene permiso).', v_codfact
        USING ERRCODE = 'P0001';
    END IF;
    v_total_fact := v_total_fact + v_rows;
  END LOOP;

  -- 3) Cerrar las salidas. valpagado se recalcula desde el detalle.
  UPDATE myappdb.salida s
     SET status = 'C',
         valpagado = coalesce((
           SELECT sum(coalesce(d.valfact, 0))
           FROM myappdb.detsalida d
           WHERE d.codsalida = s.codsalida
             AND upper(btrim(coalesce(d.pagado::text, ''))) IN ('S', 'P')
         ), 0)
   WHERE btrim(s.codsalida::text) = ANY (v_codsalidas);
  GET DIAGNOSTICS v_total_salidas = ROW_COUNT;

  IF v_total_salidas <> cardinality(v_codsalidas) THEN
    RAISE EXCEPTION 'No se pudieron cerrar todas las salidas (% de %).', v_total_salidas, cardinality(v_codsalidas)
      USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'salidas', v_total_salidas,
    'detalles', v_total_det,
    'facturas', v_total_fact,
    'codsalidas', to_jsonb(v_codsalidas)
  );
END;
$$;

REVOKE ALL ON FUNCTION myappdb.cobrar_salidas_chofer(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION myappdb.cobrar_salidas_chofer(jsonb, jsonb) TO authenticated;

-- Facturas de salidas que ya estaban cerradas antes de esta correccion:
-- liberarlas igual que lo hara la funcion (el historial sigue en detsalida).
UPDATE myappdb.factura f
   SET fa_salida = 'C',
       idsalida = NULL
  FROM myappdb.salida s
 WHERE upper(btrim(coalesce(s.status::text, ''))) = 'C'
   AND btrim(coalesce(f.idsalida::text, '')) <> ''
   AND btrim(f.idsalida::text) IN (btrim(s.codsalida::text), s.id::text);

NOTIFY pgrst, 'reload schema';
