-- Busca únicamente los datos mínimos del vendedor dentro de la empresa y
-- sucursal del usuario autenticado. Evita exponer claves/correos de usuario.
create or replace function myappdb.buscar_usuario_vendedor(p_codigo text)
returns table (
  codusuario integer,
  idusuario text,
  nombreusuario text,
  claveusuario text,
  sucursalid integer,
  cod_empre text
)
language sql
stable
security definer
set search_path = myappdb, public, pg_temp
as $function$
  select
    u.codusuario,
    u.idusuario::text,
    u.nombreusuario::text,
    u.claveusuario::text,
    u.sucursalid,
    u.cod_empre::text
  from myappdb.usuario u
  cross join app_private.current_usuario() cu
  where auth.uid() is not null
    and upper(coalesce(u.cod_empre::text, '')) = upper(coalesce(cu.cod_empre, ''))
    and u.sucursalid = cu.sucursalid
    and (
      btrim(coalesce(u.claveusuario::text, '')) = btrim(coalesce(p_codigo, ''))
      or u.codusuario::text = btrim(coalesce(p_codigo, ''))
      or lower(btrim(coalesce(u.idusuario::text, ''))) = lower(btrim(coalesce(p_codigo, '')))
    )
  order by
    case
      when btrim(coalesce(u.claveusuario::text, '')) = btrim(coalesce(p_codigo, '')) then 0
      when u.codusuario::text = btrim(coalesce(p_codigo, '')) then 1
      else 2
    end,
    u.codusuario
  limit 1;
$function$;

revoke all on function myappdb.buscar_usuario_vendedor(text) from public;
revoke all on function myappdb.buscar_usuario_vendedor(text) from anon;
grant execute on function myappdb.buscar_usuario_vendedor(text) to authenticated;

-- Estas comprobaciones son constantes durante cada petición. Envolverlas en
-- SELECT hace que Postgres las ejecute una sola vez al guardar toda la matriz.
drop policy if exists usuario_permiso_accion_root_all
  on myappdb.usuario_permiso_accion;

create policy usuario_permiso_accion_root_all
on myappdb.usuario_permiso_accion
as permissive
for all
to authenticated
using (
  (select app_private.is_root())
  or (select app_private.is_admin())
)
with check (
  (select app_private.is_root())
  or (select app_private.is_admin())
);
