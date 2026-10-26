-- fa_status = 'F' solo cuando la DGII acepto la factura.
--
-- Antes, el envio directo a DGII marcaba fa_status = 'F' con cualquier
-- respuesta (aceptada, rechazada o en proceso). Ahora la base lo impide:
-- si se intenta guardar 'F' y estado_dgii no es "Aceptado" (o
-- "Aceptado condicional"), se conserva el estado anterior de la factura
-- (o 'A' si no habia uno distinto de 'F').

CREATE OR REPLACE FUNCTION myappdb.factura_status_f_solo_aceptada()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF upper(btrim(coalesce(NEW.fa_status::text, ''))) = 'F'
     AND upper(coalesce(NEW.estado_dgii::text, '')) NOT LIKE '%ACEPT%'
     -- La cola DGII tambien trata "SUCCESS" como aceptada.
     AND upper(btrim(coalesce(NEW.estado_dgii::text, ''))) <> 'SUCCESS' THEN
    IF TG_OP = 'UPDATE'
       AND upper(btrim(coalesce(OLD.fa_status::text, ''))) NOT IN ('', 'F') THEN
      NEW.fa_status := OLD.fa_status;
    ELSE
      NEW.fa_status := 'A';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_factura_status_f_solo_aceptada ON myappdb.factura;
CREATE TRIGGER trg_factura_status_f_solo_aceptada
BEFORE INSERT OR UPDATE OF fa_status, estado_dgii
ON myappdb.factura
FOR EACH ROW
EXECUTE FUNCTION myappdb.factura_status_f_solo_aceptada();

-- Revisar facturas que hoy estan en 'F' sin estar aceptadas (no se cambian solas):
--   select fa_codfact, fa_fecfact, fa_status, estado_dgii
--   from myappdb.factura
--   where fa_status = 'F' and upper(coalesce(estado_dgii, '')) not like '%ACEPT%'
--   order by fa_fecfact desc;
-- Para corregirlas a 'A':
--   update myappdb.factura set fa_status = 'A'
--   where fa_status = 'F' and upper(coalesce(estado_dgii, '')) not like '%ACEPT%';
