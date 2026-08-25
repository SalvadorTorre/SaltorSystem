-- Recupera el enlace myappdb.usuario.auth_user_id -> auth.users.id
-- para usuarios a los que se les puso en NULL por el bug de edicion
-- (editarUsuario mandaba auth_user_id: null en cada UPDATE porque el
-- formulario de edicion nunca trae ese campo). La cuenta de Supabase
-- Auth NO se borro, solo se perdio el vinculo, asi que es recuperable
-- re-emparejando por correo / correo sintetico @saltorsystem.local.
--
-- Ejecutar en el SQL editor de Supabase. Corre primero el SELECT de
-- abajo para revisar cuantos/cuales usuarios se van a enlazar antes
-- de correr el UPDATE.

-- 1) Preview: usuarios sin auth_user_id y su posible match en auth.users
SELECT
  u.codusuario,
  u.idusuario,
  u.nombreusuario,
  u.correo,
  au.id   AS auth_user_id_encontrado,
  au.email AS auth_email_encontrado
FROM myappdb.usuario u
LEFT JOIN auth.users au
  ON (
    lower(coalesce(u.correo, '')) = lower(coalesce(au.email, ''))
    OR lower(coalesce(u.idusuario, '') || '@saltorsystem.local') = lower(coalesce(au.email, ''))
    OR lower(coalesce(u.idusuario, '') || '@usuario.saltorsystem.local') = lower(coalesce(au.email, ''))
  )
WHERE u.auth_user_id IS NULL
ORDER BY u.codusuario;

-- 2) Backfill: solo re-enlaza donde SI hay un match unico en auth.users.
-- Si un usuario no aparece con auth_user_id_encontrado en el preview,
-- no tiene cuenta de Auth que recuperar (nunca se le creo una, o el
-- correo real no coincide con lo que Auth tiene guardado) y hay que
-- crearsela de nuevo desde la pantalla de Usuarios.
BEGIN;

UPDATE myappdb.usuario u
SET auth_user_id = au.id
FROM auth.users au
WHERE u.auth_user_id IS NULL
  AND (
    lower(coalesce(u.correo, '')) = lower(coalesce(au.email, ''))
    OR lower(coalesce(u.idusuario, '') || '@saltorsystem.local') = lower(coalesce(au.email, ''))
    OR lower(coalesce(u.idusuario, '') || '@usuario.saltorsystem.local') = lower(coalesce(au.email, ''))
  );

COMMIT;

-- 3) Verificacion: deberia devolver 0 filas para los usuarios que si
-- tenian cuenta de Auth. Los que queden en NULL nunca tuvieron cuenta
-- vinculada.
SELECT codusuario, idusuario, nombreusuario, correo
FROM myappdb.usuario
WHERE auth_user_id IS NULL
ORDER BY codusuario;
