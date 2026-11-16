-- Modulo Compras > Orden de compra.
--
--  * myappdb.ordencompra   : encabezado de la orden.
--  * myappdb.ordendetalle  : productos de la orden.
--  * contfactura.contordencompra: consecutivo por ano y sucursal. El numero se
--    arma igual que la factura: AAAA + sucursal (2) + consecutivo (5),
--    por ejemplo 20260100001.
--  * RPC guardar_orden_compra: crea o edita la orden en una sola transaccion
--    (reserva el numero, guarda encabezado y detalle).
--  * RPC anular_orden_compra.
--  * Permiso compras.ordencompra (Mantenimientos > Usuario > Accesos).
--
-- Las ordenes de compra se manejan para TODAS las empresas: al crearla se
-- elige la empresa y la sucursal. Quien tenga el permiso de Orden de compra
-- (o sea root/admin) puede crear, ver y anular ordenes de cualquier empresa.

begin;

-- 1) Consecutivo en contfactura ----------------------------------------------
alter table if exists myappdb.contfactura
  add column if not exists contordencompra int4 not null default 0;

-- 2) Tablas -------------------------------------------------------------------
create table if not exists myappdb.ordencompra (
  codorden       varchar(20) primary key,
  fecorden       date not null default current_date,
  valorden       numeric(14,2) not null default 0,
  subtotal       numeric(14,2) not null default 0,
  itbis          numeric(14,2) not null default 0,
  codsuplidor    int4,
  nomsuplidor    varchar(150),
  rncsuplidor    varchar(20),
  condicionpago  varchar(40),
  observacion    text,
  codempresa     varchar(30) not null,
  codsucursal    int4 not null,
  status         varchar(1) not null default 'P',      -- P pendiente, R recibida, A anulada
  estadocxp      varchar(20) not null default 'PENDIENTE', -- PENDIENTE / PAGADA
  codusuario     int4,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint chk_ordencompra_status check (status in ('P', 'R', 'A'))
);

comment on table myappdb.ordencompra is 'Ordenes de compra (Compras > Orden de compra).';
comment on column myappdb.ordencompra.status is 'P = pendiente, R = recibida, A = anulada.';
comment on column myappdb.ordencompra.estadocxp is 'Estado en cuentas por pagar: PENDIENTE o PAGADA.';

create table if not exists myappdb.ordendetalle (
  id           bigserial primary key,
  codorden     varchar(20) not null references myappdb.ordencompra(codorden) on delete cascade,
  linea        int4 not null,
  codproducto  varchar(20),
  descripcion  varchar(200) not null,
  cantidad     numeric(14,2) not null default 0,
  costo        numeric(14,4) not null default 0,
  porc_itbis   numeric(5,2) not null default 0,
  itbis        numeric(14,2) not null default 0,
  total        numeric(14,2) not null default 0,
  unique (codorden, linea)
);

create index if not exists idx_ordencompra_tenant_fecha
  on myappdb.ordencompra (codempresa, codsucursal, fecorden desc, codorden desc);
create index if not exists idx_ordencompra_suplidor
  on myappdb.ordencompra (codsuplidor);
create index if not exists idx_ordendetalle_orden
  on myappdb.ordendetalle (codorden, linea);

grant select, insert, update, delete on table myappdb.ordencompra to authenticated;
grant select, insert, update, delete on table myappdb.ordendetalle to authenticated;
grant usage, select on all sequences in schema myappdb to authenticated;

-- 3) RLS: misma regla de empresa/sucursal que gastos menores -------------------
alter table myappdb.ordencompra enable row level security;
alter table myappdb.ordendetalle enable row level security;

drop policy if exists ordencompra_select_tenant on myappdb.ordencompra;
drop policy if exists ordencompra_insert_tenant on myappdb.ordencompra;
drop policy if exists ordencompra_update_tenant on myappdb.ordencompra;
drop policy if exists ordencompra_delete_tenant on myappdb.ordencompra;

create policy ordencompra_select_tenant on myappdb.ordencompra
for select to authenticated
using (
  app_private.can_access_row(codempresa::text, codsucursal::text, null, null)
  or app_private.has_permission('compras.ordencompra', 'ver')
);

create policy ordencompra_insert_tenant on myappdb.ordencompra
for insert to authenticated
with check (app_private.can_access_row(codempresa::text, codsucursal::text, null, null));

create policy ordencompra_update_tenant on myappdb.ordencompra
for update to authenticated
using (app_private.can_access_row(codempresa::text, codsucursal::text, null, null))
with check (app_private.can_access_row(codempresa::text, codsucursal::text, null, null));

create policy ordencompra_delete_tenant on myappdb.ordencompra
for delete to authenticated
using (app_private.can_access_row(codempresa::text, codsucursal::text, null, null));

drop policy if exists ordendetalle_select_tenant on myappdb.ordendetalle;
drop policy if exists ordendetalle_write_tenant on myappdb.ordendetalle;

create policy ordendetalle_select_tenant on myappdb.ordendetalle
for select to authenticated
using (exists (
  select 1 from myappdb.ordencompra o
  where o.codorden = ordendetalle.codorden
    and (
      app_private.can_access_row(o.codempresa::text, o.codsucursal::text, null, null)
      or app_private.has_permission('compras.ordencompra', 'ver')
    )
));

create policy ordendetalle_write_tenant on myappdb.ordendetalle
for all to authenticated
using (exists (
  select 1 from myappdb.ordencompra o
  where o.codorden = ordendetalle.codorden
    and app_private.can_access_row(o.codempresa::text, o.codsucursal::text, null, null)
))
with check (exists (
  select 1 from myappdb.ordencompra o
  where o.codorden = ordendetalle.codorden
    and (
      app_private.can_access_row(o.codempresa::text, o.codsucursal::text, null, null)
      or app_private.has_permission('compras.ordencompra', 'ver')
    )
));

-- 4) Guardar (crear o editar) en una sola transaccion -------------------------
create or replace function myappdb.guardar_orden_compra(
  p_orden jsonb,
  p_detalles jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = myappdb, public
as $$
declare
  cu record;
  v_codorden text := nullif(btrim(coalesce(p_orden->>'codorden', '')), '');
  v_empresa text := nullif(btrim(coalesce(p_orden->>'codempresa', '')), '');
  v_suc integer := nullif(nullif(p_orden->>'codsucursal', '')::integer, 0);
  v_cont record;
  v_ano integer;
  v_next integer;
  v_existente myappdb.ordencompra%rowtype;
  v_subtotal numeric(14,2);
  v_itbis numeric(14,2);
  v_total numeric(14,2);
  v_lineas integer;
begin
  if auth.uid() is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  select * into cu from app_private.current_usuario() limit 1;
  v_empresa := coalesce(v_empresa, cu.cod_empre::text);
  v_suc := coalesce(v_suc, cu.sucursalid);

  if v_empresa is null or v_suc is null then
    raise exception 'No hay empresa o sucursal para la orden de compra.' using errcode = '22023';
  end if;

  if not exists (select 1 from myappdb.empresas e where e.cod_empre = v_empresa) then
    raise exception 'La empresa % no existe.', v_empresa using errcode = '22023';
  end if;
  if not exists (
    select 1 from myappdb.sucursales s
    where s.cod_sucursal = v_suc and s.cod_empre = v_empresa
  ) then
    raise exception 'La sucursal % no pertenece a la empresa %.', v_suc, v_empresa using errcode = '22023';
  end if;

  if jsonb_typeof(p_detalles) <> 'array' or jsonb_array_length(p_detalles) = 0 then
    raise exception 'La orden debe tener al menos un producto.' using errcode = '22023';
  end if;

  if nullif(btrim(coalesce(p_orden->>'nomsuplidor', '')), '') is null then
    raise exception 'Indique el suplidor de la orden.' using errcode = '22023';
  end if;

  -- Totales calculados en la base a partir del detalle.
  select coalesce(sum(round(coalesce((d->>'cantidad')::numeric, 0) * coalesce((d->>'costo')::numeric, 0), 2)), 0),
         coalesce(sum(round(coalesce((d->>'cantidad')::numeric, 0) * coalesce((d->>'costo')::numeric, 0)
                            * coalesce((d->>'porc_itbis')::numeric, 0) / 100, 2)), 0),
         count(*)
    into v_subtotal, v_itbis, v_lineas
  from jsonb_array_elements(p_detalles) d
  where coalesce((d->>'cantidad')::numeric, 0) > 0;

  if v_lineas = 0 then
    raise exception 'Todas las lineas de la orden tienen cantidad cero.' using errcode = '22023';
  end if;
  v_total := v_subtotal + v_itbis;

  if not (
    app_private.has_permission('compras.ordencompra', case when v_codorden is null then 'crear' else 'editar' end)
    or app_private.current_usuario_tenant_ok(v_empresa, v_suc::text)
  ) then
    raise exception 'No tiene permiso para % ordenes de compra.',
      case when v_codorden is null then 'crear' else 'editar' end using errcode = '42501';
  end if;

  if v_codorden is null then
    -- Numero nuevo: misma logica que la factura (contfactura por ano y sucursal).
    v_ano := extract(year from current_date)::integer;

    select * into v_cont
    from myappdb.contfactura c
    where c.idsucursal = v_suc and c.ano = v_ano
    order by c.id desc
    limit 1
    for update;

    if not found then
      select * into v_cont
      from myappdb.contfactura c
      where c.idsucursal = v_suc
      order by c.id desc
      limit 1
      for update;
    end if;

    if not found then
      raise exception 'No existe contfactura para la sucursal %.', v_suc using errcode = 'P0001';
    end if;

    v_ano := coalesce(nullif(v_cont.ano, 0), v_ano);
    v_next := coalesce(v_cont.contordencompra, 0);
    loop
      v_next := v_next + 1;
      v_codorden := lpad(right(v_ano::text, 4), 4, '0')
                 || lpad(right(v_suc::text, 2), 2, '0')
                 || lpad(right(v_next::text, 5), 5, '0');
      exit when not exists (select 1 from myappdb.ordencompra o where o.codorden = v_codorden);
      if v_next - coalesce(v_cont.contordencompra, 0) > 1000 then
        raise exception 'No se pudo generar un numero de orden disponible.' using errcode = 'P0001';
      end if;
    end loop;

    update myappdb.contfactura set contordencompra = v_next where id = v_cont.id;

    insert into myappdb.ordencompra (
      codorden, fecorden, valorden, subtotal, itbis, codsuplidor, nomsuplidor,
      rncsuplidor, condicionpago, observacion, codempresa, codsucursal,
      status, estadocxp, codusuario
    ) values (
      v_codorden,
      coalesce(nullif(p_orden->>'fecorden', '')::date, current_date),
      v_total, v_subtotal, v_itbis,
      nullif(p_orden->>'codsuplidor', '')::integer,
      left(btrim(p_orden->>'nomsuplidor'), 150),
      left(nullif(btrim(coalesce(p_orden->>'rncsuplidor', '')), ''), 20),
      left(nullif(btrim(coalesce(p_orden->>'condicionpago', '')), ''), 40),
      nullif(btrim(coalesce(p_orden->>'observacion', '')), ''),
      v_empresa, v_suc, 'P', 'PENDIENTE', cu.codusuario
    );
  else
    select * into v_existente from myappdb.ordencompra o where o.codorden = v_codorden for update;
    if not found then
      raise exception 'La orden % no existe.', v_codorden using errcode = 'P0001';
    end if;
    if v_existente.status <> 'P' then
      raise exception 'La orden % no esta pendiente y no se puede editar.', v_codorden using errcode = 'P0001';
    end if;

    if v_existente.codempresa <> v_empresa or v_existente.codsucursal <> v_suc then
      raise exception 'No se puede cambiar la empresa o sucursal de una orden ya creada.' using errcode = 'P0001';
    end if;

    update myappdb.ordencompra o
       set fecorden = coalesce(nullif(p_orden->>'fecorden', '')::date, o.fecorden),
           valorden = v_total,
           subtotal = v_subtotal,
           itbis = v_itbis,
           codsuplidor = nullif(p_orden->>'codsuplidor', '')::integer,
           nomsuplidor = left(btrim(p_orden->>'nomsuplidor'), 150),
           rncsuplidor = left(nullif(btrim(coalesce(p_orden->>'rncsuplidor', '')), ''), 20),
           condicionpago = left(nullif(btrim(coalesce(p_orden->>'condicionpago', '')), ''), 40),
           observacion = nullif(btrim(coalesce(p_orden->>'observacion', '')), ''),
           updated_at = now()
     where o.codorden = v_codorden;

    delete from myappdb.ordendetalle d where d.codorden = v_codorden;
  end if;

  insert into myappdb.ordendetalle (
    codorden, linea, codproducto, descripcion, cantidad, costo, porc_itbis, itbis, total
  )
  select v_codorden,
         row_number() over (order by x.ord)::integer,
         left(nullif(btrim(coalesce(x.d->>'codproducto', '')), ''), 20),
         left(coalesce(nullif(btrim(coalesce(x.d->>'descripcion', '')), ''), 'Sin descripcion'), 200),
         coalesce((x.d->>'cantidad')::numeric, 0),
         coalesce((x.d->>'costo')::numeric, 0),
         coalesce((x.d->>'porc_itbis')::numeric, 0),
         round(coalesce((x.d->>'cantidad')::numeric, 0) * coalesce((x.d->>'costo')::numeric, 0)
               * coalesce((x.d->>'porc_itbis')::numeric, 0) / 100, 2),
         round(coalesce((x.d->>'cantidad')::numeric, 0) * coalesce((x.d->>'costo')::numeric, 0), 2)
  from jsonb_array_elements(p_detalles) with ordinality as x(d, ord)
  where coalesce((x.d->>'cantidad')::numeric, 0) > 0;

  return jsonb_build_object(
    'codorden', v_codorden,
    'subtotal', v_subtotal,
    'itbis', v_itbis,
    'valorden', v_total
  );
end;
$$;

revoke all on function myappdb.guardar_orden_compra(jsonb, jsonb) from public;
grant execute on function myappdb.guardar_orden_compra(jsonb, jsonb) to authenticated;

-- 5) Anular -------------------------------------------------------------------
create or replace function myappdb.anular_orden_compra(p_codorden text)
returns jsonb
language plpgsql
security definer
set search_path = myappdb, public
as $$
declare
  v_row myappdb.ordencompra%rowtype;
begin
  if auth.uid() is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  select * into v_row from myappdb.ordencompra o where o.codorden = btrim(p_codorden) for update;
  if not found then
    raise exception 'La orden % no existe.', p_codorden using errcode = 'P0001';
  end if;
  if not (
    app_private.has_permission('compras.ordencompra', 'anular')
    or app_private.current_usuario_tenant_ok(v_row.codempresa, v_row.codsucursal::text)
  ) then
    raise exception 'No tiene permiso para anular ordenes de compra.' using errcode = '42501';
  end if;
  if v_row.status <> 'P' then
    raise exception 'Solo se pueden anular ordenes pendientes.' using errcode = 'P0001';
  end if;

  update myappdb.ordencompra set status = 'A', updated_at = now()
   where codorden = v_row.codorden
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

revoke all on function myappdb.anular_orden_compra(text) from public;
grant execute on function myappdb.anular_orden_compra(text) to authenticated;

-- 6) Permisos (Mantenimientos > Usuario > Accesos por modulo > Compras) ------
insert into myappdb.permiso_recurso_catalogo
  (modulo_key, modulo_nombre, recurso_key, pantalla_nombre, ruta, activo, requiere_tenant, orden)
values
  ('compras', 'Compras', 'compras.ordencompra', 'Orden de compra',
   '/private/compras/orden-compra', true, true, 130)
on conflict (recurso_key) do update
set modulo_key = excluded.modulo_key,
    modulo_nombre = excluded.modulo_nombre,
    pantalla_nombre = excluded.pantalla_nombre,
    ruta = excluded.ruta,
    activo = excluded.activo,
    requiere_tenant = excluded.requiere_tenant,
    orden = excluded.orden;

insert into myappdb.permiso_recurso_accion_catalogo (recurso_key, accion_key, activo)
values
  ('compras.ordencompra', 'ver', true),
  ('compras.ordencompra', 'crear', true),
  ('compras.ordencompra', 'editar', true),
  ('compras.ordencompra', 'anular', true),
  ('compras.ordencompra', 'imprimir', true)
on conflict (recurso_key, accion_key) do update
set activo = excluded.activo;

commit;

notify pgrst, 'reload schema';
