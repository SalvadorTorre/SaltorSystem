-- Permite que usuarios DIGITADOR(A) busquen usuarios CHOFER por codusuario
-- en /almacen/salidafactura, limitados a su misma empresa y sucursal.

drop policy if exists usuario_select_chofer_digitador on myappdb.usuario;

create policy usuario_select_chofer_digitador
on myappdb.usuario
for select
to authenticated
using (
  idtipousuario = 8
  and exists (
    select 1
    from app_private.current_usuario() cu
    where cu.idtipousuario = 6
      and upper(coalesce(cu.cod_empre, '')) = upper(coalesce(usuario.cod_empre::text, ''))
      and cu.sucursalid = usuario.sucursalid
  )
);
