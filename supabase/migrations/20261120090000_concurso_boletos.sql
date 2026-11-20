-- Rifa / Sorteo: boletos numerados por factura.
--
--  * myappdb.concurso.ultimo_boleto: ultimo numero entregado (consecutivo
--    por concurso, empieza en 1).
--  * myappdb.concurso_boleto: cada boleto entregado (concurso, numero,
--    factura y datos del cliente para el talon de la tombola).
--  * RPC myappdb.generar_boletos_factura(codfact): Caja la llama al cobrar.
--    Revisa los concursos activos y vigentes de la empresa/sucursal de la
--    factura, calcula los boletos segun las reglas y los numera. Es
--    idempotente: si la factura ya tiene boletos en un concurso, devuelve
--    los mismos numeros (sirve para reimprimir) y no crea otros.
--
--  Reglas (iguales a las del simulador de la pantalla):
--    - factura no anulada y con fecha dentro de fecha_inicio..fecha_fin.
--    - contado (fa_tipopago <> 2) solo si aplica_contado; si solo_pagadas,
--      la factura debe estar marcada como pagada (fa_fpago = 'S').
--    - credito (fa_tipopago = 2) solo si aplica_credito.
--    - base: TOTAL (fa_valfact) o SUBTOTAL (fa_subfact).
--    - monto_minimo, modo MULTIPLO / RANGO y max_boletos_factura.

begin;

alter table myappdb.concurso
  add column if not exists ultimo_boleto int4 not null default 0;

create table if not exists myappdb.concurso_boleto (
  id           bigserial primary key,
  concurso_id  bigint not null references myappdb.concurso(id) on delete cascade,
  numero       int4 not null,
  codfact      varchar(20) not null,
  codempresa   varchar(30) not null,
  codsucursal  int4,
  codclie      varchar(20),
  nomclie      varchar(150),
  telclie      varchar(40),
  monto_base   numeric(14,2) not null default 0,
  created_at   timestamptz not null default now(),
  created_by   text,
  unique (concurso_id, numero)
);

create index if not exists idx_concurso_boleto_factura
  on myappdb.concurso_boleto (codfact, concurso_id);

grant select on table myappdb.concurso_boleto to authenticated;

alter table myappdb.concurso_boleto enable row level security;
drop policy if exists concurso_boleto_select_tenant on myappdb.concurso_boleto;
create policy concurso_boleto_select_tenant on myappdb.concurso_boleto
for select to authenticated
using (app_private.can_access_row(codempresa::text, codsucursal::text, null, null));

-- Calculo de boletos (misma regla que ServicioConcurso.calcularBoletos) ------
create or replace function myappdb.calcular_boletos_concurso(
  p_concurso myappdb.concurso,
  p_monto numeric
)
returns integer
language plpgsql
immutable
as $$
declare
  v_boletos integer := 0;
  v_rango jsonb;
begin
  if coalesce(p_monto, 0) <= 0 or p_monto < coalesce(p_concurso.monto_minimo, 0) then
    return 0;
  end if;

  if p_concurso.modo = 'RANGO' then
    select r into v_rango
    from jsonb_array_elements(coalesce(p_concurso.rangos, '[]'::jsonb)) r
    where coalesce((r->>'desde')::numeric, 0) > 0
      and coalesce((r->>'boletos')::numeric, 0) >= 1
      and p_monto >= (r->>'desde')::numeric
    order by (r->>'desde')::numeric desc
    limit 1;
    v_boletos := coalesce(floor((v_rango->>'boletos')::numeric)::integer, 0);
  elsif coalesce(p_concurso.monto_por_boleto, 0) > 0 then
    v_boletos := floor(p_monto / p_concurso.monto_por_boleto)::integer;
  end if;

  if coalesce(p_concurso.max_boletos_factura, 0) > 0 then
    v_boletos := least(v_boletos, p_concurso.max_boletos_factura);
  end if;

  return greatest(v_boletos, 0);
end;
$$;

-- Generar (o devolver) los boletos de una factura -----------------------------
create or replace function myappdb.generar_boletos_factura(p_codfact text)
returns jsonb
language plpgsql
security definer
set search_path = myappdb, public
as $$
declare
  f record;
  c myappdb.concurso;
  v_monto numeric;
  v_cantidad integer;
  v_desde integer;
  v_numeros jsonb;
  v_nuevo boolean;
  v_resultado jsonb := '[]'::jsonb;
  v_usuario text := coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), current_user);
begin
  select * into f
  from myappdb.factura
  where fa_codfact = btrim(coalesce(p_codfact, ''))
  limit 1;

  if f is null then
    raise exception 'Factura % no encontrada.', p_codfact using errcode = 'P0002';
  end if;

  if not app_private.can_access_row(f.fa_codempr::text, f.fa_codsucu::text, null, null) then
    raise exception 'La factura no pertenece al tenant activo.' using errcode = '42501';
  end if;

  if upper(coalesce(f.fa_status, '')) = 'A' then
    return jsonb_build_object('codfact', f.fa_codfact, 'concursos', '[]'::jsonb);
  end if;

  for c in
    select *
    from myappdb.concurso k
    where k.activo
      and upper(k.codempresa) = upper(coalesce(f.fa_codempr, ''))
      and (k.codsucursal is null or k.codsucursal = f.fa_codsucu)
      and coalesce(f.fa_fecfact, current_date) between k.fecha_inicio and k.fecha_fin
    order by k.id
    for update
  loop
    v_nuevo := false;

    select jsonb_agg(b.numero order by b.numero)
      into v_numeros
    from myappdb.concurso_boleto b
    where b.concurso_id = c.id and b.codfact = f.fa_codfact;

    if v_numeros is null then
      -- Condiciones de la factura
      if btrim(coalesce(f.fa_tipopago::text, '1')) = '2' then
        continue when not c.aplica_credito;
      else
        continue when not c.aplica_contado;
        continue when c.solo_pagadas and upper(coalesce(f.fa_fpago, '')) <> 'S';
      end if;

      v_monto := case when c.base_calculo = 'SUBTOTAL'
                      then coalesce(f.fa_subfact, 0)
                      else coalesce(f.fa_valfact, 0) end;
      v_cantidad := myappdb.calcular_boletos_concurso(c, v_monto);
      continue when v_cantidad <= 0;

      v_desde := c.ultimo_boleto + 1;
      update myappdb.concurso
         set ultimo_boleto = ultimo_boleto + v_cantidad
       where id = c.id;

      insert into myappdb.concurso_boleto
        (concurso_id, numero, codfact, codempresa, codsucursal,
         codclie, nomclie, telclie, monto_base, created_by)
      select c.id, n, f.fa_codfact, c.codempresa, f.fa_codsucu,
             nullif(btrim(coalesce(f.fa_codclie::text, '')), ''),
             nullif(btrim(coalesce(f.fa_nomclie, '')), ''),
             nullif(btrim(coalesce(f.fa_telclie, '')), ''),
             v_monto, v_usuario
      from generate_series(v_desde, v_desde + v_cantidad - 1) n;

      select jsonb_agg(n) into v_numeros
      from generate_series(v_desde, v_desde + v_cantidad - 1) n;
      v_nuevo := true;
    end if;

    v_resultado := v_resultado || jsonb_build_array(jsonb_build_object(
      'concurso_id', c.id,
      'nombre', c.nombre,
      'tipo', c.tipo,
      'premios', c.premios,
      'descripcion', c.descripcion,
      'fecha_fin', c.fecha_fin,
      'numeros', v_numeros,
      'nuevos', v_nuevo
    ));
  end loop;

  return jsonb_build_object(
    'codfact', f.fa_codfact,
    'fecha', coalesce(f.fa_fecfact, current_date),
    'cliente', f.fa_nomclie,
    'telefono', f.fa_telclie,
    'concursos', v_resultado
  );
end;
$$;

revoke all on function myappdb.generar_boletos_factura(text) from public;
grant execute on function myappdb.generar_boletos_factura(text) to authenticated;

commit;

notify pgrst, 'reload schema';
