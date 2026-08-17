-- El Reporte 607 consolida todas las sucursales de una empresa. Estas
-- politicas permiten leer la factura y su detalle, y guardar exclusivamente
-- operaciones DGII, sin permitir acceso a otra empresa.

drop policy if exists factura_reporte607_company_select on myappdb.factura;
create policy factura_reporte607_company_select
on myappdb.factura
for select to authenticated
using (
  exists (
    select 1
    from app_private.current_usuario() cu
    where upper(btrim(coalesce(fa_codempr, ''))) = upper(btrim(coalesce(cu.cod_empre, '')))
      and app_private.has_any_permission(
        '[
          {"recurso":"contabilidad.reporte_607","accion":"ver"},
          {"recurso":"facturacion.factura","accion":"enviar_dgii"},
          {"recurso":"caja.cobrofact","accion":"enviar_dgii"}
        ]'::jsonb,
        cu.cod_empre,
        cu.sucursalid::text
      )
  )
);

drop policy if exists detfactura_reporte607_company_select on myappdb.detfactura;
create policy detfactura_reporte607_company_select
on myappdb.detfactura
for select to authenticated
using (
  exists (
    select 1
    from app_private.current_usuario() cu
    where upper(btrim(coalesce(df_codepr, ''))) = upper(btrim(coalesce(cu.cod_empre, '')))
      and app_private.has_any_permission(
        '[
          {"recurso":"contabilidad.reporte_607","accion":"ver"},
          {"recurso":"facturacion.factura","accion":"enviar_dgii"},
          {"recurso":"caja.cobrofact","accion":"enviar_dgii"}
        ]'::jsonb,
        cu.cod_empre,
        cu.sucursalid::text
      )
  )
);

drop policy if exists factura_reporte607_company_dgii_update on myappdb.factura;
create policy factura_reporte607_company_dgii_update
on myappdb.factura
for update to authenticated
using (
  exists (
    select 1
    from app_private.current_usuario() cu
    where upper(btrim(coalesce(fa_codempr, ''))) = upper(btrim(coalesce(cu.cod_empre, '')))
      and app_private.has_any_permission(
        '[
          {"recurso":"facturacion.factura","accion":"editar"},
          {"recurso":"facturacion.factura","accion":"enviar_dgii"},
          {"recurso":"caja.cobrofact","accion":"enviar_dgii"}
        ]'::jsonb,
        cu.cod_empre,
        cu.sucursalid::text
      )
  )
)
with check (
  exists (
    select 1
    from app_private.current_usuario() cu
    where upper(btrim(coalesce(fa_codempr, ''))) = upper(btrim(coalesce(cu.cod_empre, '')))
      and app_private.has_any_permission(
        '[
          {"recurso":"facturacion.factura","accion":"editar"},
          {"recurso":"facturacion.factura","accion":"enviar_dgii"},
          {"recurso":"caja.cobrofact","accion":"enviar_dgii"}
        ]'::jsonb,
        cu.cod_empre,
        cu.sucursalid::text
      )
  )
);

notify pgrst, 'reload schema';
