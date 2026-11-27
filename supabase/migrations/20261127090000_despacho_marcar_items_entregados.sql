-- Despacho: al imprimir una factura en Despachadores se marcan como
-- entregados los items del rol que imprime:
--   * Hierro / Dep. almacen (H) -> detfactura con df_tipomerc = 'H'
--   * Forjas (F)               -> detfactura con df_tipomerc = 'F'
-- Esos items quedan df_pendiente = 'N' y df_canpend = 0.
-- Cuando ya no queda ningun item de Hierro ni de Forjas pendiente, la factura
-- queda fa_pendiente = 'N'.
--
-- SECURITY DEFINER: el despachador no siempre puede actualizar detfactura por
-- RLS; se valida una vez que la factura sea de su empresa/sucursal.

begin;

create or replace function myappdb.despacho_marcar_items_entregados(
  p_codfact text,
  p_tipo text
)
returns jsonb
language plpgsql
security definer
set search_path = myappdb, public
as $$
declare
  v_cod text := btrim(coalesce(p_codfact, ''));
  v_tipo text := upper(btrim(coalesce(p_tipo, '')));
  f record;
  v_items integer := 0;
  v_quedan integer := 0;
begin
  if auth.uid() is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;
  if v_cod = '' or v_tipo not in ('H', 'F') then
    raise exception 'Factura o rol de despacho no valido.' using errcode = '22023';
  end if;

  select fa_codfact, fa_codempr, fa_codsucu into f
  from myappdb.factura
  where fa_codfact = v_cod
  limit 1;
  if f is null then
    raise exception 'Factura % no encontrada.', v_cod using errcode = 'P0002';
  end if;
  if not app_private.can_access_row(f.fa_codempr::text, f.fa_codsucu::text, null, null) then
    raise exception 'La factura no pertenece al tenant activo.' using errcode = '42501';
  end if;

  update myappdb.detfactura d
     set df_pendiente = 'N',
         df_canpend = 0
   where d.df_codfact = f.fa_codfact
     and upper(btrim(coalesce(d.df_tipomerc, ''))) = v_tipo;
  get diagnostics v_items = row_count;

  select count(*) into v_quedan
  from myappdb.detfactura d
  where d.df_codfact = f.fa_codfact
    and upper(btrim(coalesce(d.df_tipomerc, ''))) in ('H', 'F')
    and (upper(btrim(coalesce(d.df_pendiente, ''))) = 'S' or coalesce(d.df_canpend, 0) > 0);

  if v_quedan = 0 then
    update myappdb.factura
       set fa_pendiente = 'N'
     where fa_codfact = f.fa_codfact;
  end if;

  return jsonb_build_object(
    'codfact', f.fa_codfact,
    'tipo', v_tipo,
    'items_marcados', v_items,
    'items_pendientes', v_quedan,
    'factura_sin_pendiente', v_quedan = 0
  );
end;
$$;

revoke all on function myappdb.despacho_marcar_items_entregados(text, text) from public;
grant execute on function myappdb.despacho_marcar_items_entregados(text, text) to authenticated;

commit;

notify pgrst, 'reload schema';
