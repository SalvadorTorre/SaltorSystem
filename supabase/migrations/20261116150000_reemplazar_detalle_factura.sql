-- Control de facturas (/almacen/controlfact) y Facturacion: al editar una
-- factura se reemplaza su detalle (borrar lineas anteriores + insertar las
-- actuales).
--
-- Problema: el borrado y la insercion se hacian desde la pantalla, linea por
-- linea con RLS. Si la politica de borrado no dejaba borrar (o tardaba), el
-- borrado afectaba 0 filas SIN error, y la factura quedaba con el monto nuevo
-- pero con los productos de antes (no se agregaban ni se quitaban items).
--
-- Esta funcion hace el reemplazo en una sola transaccion, validando el
-- permiso UNA vez: o se reemplaza todo el detalle o no se cambia nada.

create or replace function myappdb.reemplazar_detalle_factura(
  p_codfact text,
  p_detalle jsonb
)
returns integer
language plpgsql
security definer
set search_path = myappdb, public
as $$
declare
  v_cod text := btrim(coalesce(p_codfact, ''));
  v_empr text;
  v_sucu integer;
  v_insertadas integer := 0;
begin
  if auth.uid() is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;
  if v_cod = '' then
    raise exception 'Debe indicar la factura.' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_detalle, '[]'::jsonb)) <> 'array' then
    raise exception 'El detalle debe ser una lista.' using errcode = '22023';
  end if;

  select f.fa_codempr::text, f.fa_codsucu
    into v_empr, v_sucu
  from myappdb.factura f
  where f.fa_codfact = v_cod
  for update;

  if not found then
    raise exception 'No se encontro la factura %.', v_cod using errcode = 'P0001';
  end if;

  if not (
    coalesce(app_private.is_root(), false)
    or (
      app_private.current_usuario_tenant_ok(v_empr, v_sucu::text)
      and app_private.has_any_permission(
        '[
          {"recurso":"facturacion.factura","accion":"editar"},
          {"recurso":"almacen.controlfact","accion":"editar"}
        ]'::jsonb,
        v_empr,
        v_sucu::text
      )
    )
  ) then
    raise exception 'No tiene permiso para editar el detalle de la factura %.', v_cod using errcode = '42501';
  end if;

  delete from myappdb.detfactura d where d.df_codfact = v_cod;

  insert into myappdb.detfactura (
    df_codfact, df_fecfact, df_codmerc, df_tipomerc, df_desmerc, df_canmerc,
    df_premerc, df_valmerc, df_cosmerc, df_codclie, df_status, df_imp,
    df_codepr, tenant_rnc, df_codsucu
  )
  select v_cod, r.df_fecfact, r.df_codmerc, r.df_tipomerc, r.df_desmerc, r.df_canmerc,
         r.df_premerc, r.df_valmerc, r.df_cosmerc, r.df_codclie, r.df_status, r.df_imp,
         coalesce(r.df_codepr, v_empr), r.tenant_rnc, coalesce(r.df_codsucu, v_sucu::text)
  from jsonb_populate_recordset(null::myappdb.detfactura, coalesce(p_detalle, '[]'::jsonb)) r;
  get diagnostics v_insertadas = row_count;

  return v_insertadas;
end;
$$;

revoke all on function myappdb.reemplazar_detalle_factura(text, jsonb) from public;
grant execute on function myappdb.reemplazar_detalle_factura(text, jsonb) to authenticated;

notify pgrst, 'reload schema';
