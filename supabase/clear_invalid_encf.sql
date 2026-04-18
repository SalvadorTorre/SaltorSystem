-- Limpieza ENCF: elimina todos los registros actuales de myappdb.encf
-- Usar cuando los datos cargados no son validos y se va a reiniciar configuracion.

BEGIN;

DELETE FROM myappdb.encf;

-- Reiniciar secuencia para volver a iniciar en 1
SELECT setval('myappdb.encf_id_seq', 1, false);

COMMIT;
