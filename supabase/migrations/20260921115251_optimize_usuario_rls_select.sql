begin;

-- La politica generica can_access_row recalculaba current_usuario/is_root por
-- cada fila de usuario. Bajo carga eso agotaba el pool de PostgREST y la
-- pantalla quedaba vacia por statement timeout.
drop policy if exists rls_select_tenant on myappdb.usuario;

create policy rls_select_tenant
on myappdb.usuario
for select
to authenticated
using (
  (select app_private.is_root())
  or (
    (select app_private.is_admin())
    and (
      cod_empre is null
      or btrim(cod_empre::text) = ''
      or upper(cod_empre::text) = upper(coalesce(
        (select cu.cod_empre from app_private.current_usuario() cu limit 1),
        ''
      ))
    )
  )
  or codusuario = (
    select cu.codusuario
    from app_private.current_usuario() cu
    limit 1
  )
);

commit;
