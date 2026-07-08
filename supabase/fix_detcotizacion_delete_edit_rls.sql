-- Permite reemplazar los detalles de una cotizacion durante edicion.
-- El servicio edita el encabezado, borra los detalles anteriores por dc_codcoti
-- e inserta los detalles actuales. Si DELETE queda bloqueado por RLS,
-- los detalles se duplican.
drop policy if exists detcotizacion_delete_permiso on myappdb.detcotizacion;

create policy detcotizacion_delete_permiso
on myappdb.detcotizacion
for delete
to authenticated
using (
  (
    app_private.current_usuario_tenant_ok((dc_codempr)::text, (dc_codsucu)::text)
    or exists (
      select 1
      from myappdb.cotizacion c
      where c.ct_codcoti = dc_codcoti
        and app_private.current_usuario_tenant_ok((c.ct_codempr)::text, (c.ct_cod_sucu)::text)
    )
  )
  and exists (
    select 1
    from myappdb.cotizacion c
    where c.ct_codcoti = dc_codcoti
      and app_private.has_any_permission(
        '[
          {"accion": "editar", "recurso": "cotizacion.gestion"},
          {"accion": "eliminar", "recurso": "cotizacion.gestion"},
          {"accion": "anular", "recurso": "cotizacion.gestion"}
        ]'::jsonb,
        (c.ct_codempr)::text,
        (c.ct_cod_sucu)::text
      )
  )
);
