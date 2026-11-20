-- Rifa / Sorteo: ajustes despues de la primera prueba.
--
--  * generar_boletos_factura: la vigencia se valida con la fecha del cobro
--    (hoy), no con la fecha en que se creo la factura. Una factura hecha antes
--    de que empezara el concurso y cobrada durante el concurso si participa.
--  * Factura pagada: se acepta fa_fpago 'S' o 'P' (igual que Caja).
--  * diagnostico_boletos_factura(codfact): explica, concurso por concurso,
--    por que una factura gano o no gano boletos.
--      select * from myappdb.diagnostico_boletos_factura('20261100123');

begin;

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
      and current_date between k.fecha_inicio and k.fecha_fin
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
        continue when c.solo_pagadas and upper(btrim(coalesce(f.fa_fpago, ''))) not in ('S', 'P');
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

create or replace function myappdb.diagnostico_boletos_factura(p_codfact text)
returns table (
  concurso_id bigint,
  concurso text,
  boletos_entregados integer,
  boletos_que_le_tocan integer,
  monto_base numeric,
  motivo text
)
language plpgsql
security definer
set search_path = myappdb, public
as $$
declare
  f record;
  c myappdb.concurso;
  v_monto numeric;
  v_motivos text[];
begin
  select * into f from myappdb.factura
  where fa_codfact = btrim(coalesce(p_codfact, '')) limit 1;
  if f is null then
    raise exception 'Factura % no encontrada.', p_codfact;
  end if;
  -- Desde el editor SQL (sin usuario de la app) se permite consultar todo;
  -- desde la app se respeta la empresa/sucursal del usuario.
  if auth.uid() is not null
     and not app_private.can_access_row(f.fa_codempr::text, f.fa_codsucu::text, null, null) then
    raise exception 'La factura no pertenece al tenant activo.' using errcode = '42501';
  end if;

  for c in select * from myappdb.concurso k order by k.id loop
    v_motivos := array[]::text[];
    v_monto := case when c.base_calculo = 'SUBTOTAL'
                    then coalesce(f.fa_subfact, 0) else coalesce(f.fa_valfact, 0) end;

    if not c.activo then
      v_motivos := v_motivos || 'concurso inactivo'::text;
    end if;
    if upper(c.codempresa) <> upper(coalesce(f.fa_codempr, '')) then
      v_motivos := v_motivos || format('empresa del concurso %s <> empresa de la factura %s', c.codempresa, coalesce(f.fa_codempr, '(vacia)'));
    end if;
    if c.codsucursal is not null and c.codsucursal is distinct from f.fa_codsucu then
      v_motivos := v_motivos || format('sucursal del concurso %s <> sucursal de la factura %s', c.codsucursal, coalesce(f.fa_codsucu::text, '(vacia)'));
    end if;
    if current_date not between c.fecha_inicio and c.fecha_fin then
      v_motivos := v_motivos || format('hoy %s esta fuera de la vigencia %s a %s', current_date, c.fecha_inicio, c.fecha_fin);
    end if;
    if upper(coalesce(f.fa_status, '')) = 'A' then
      v_motivos := v_motivos || 'factura anulada'::text;
    end if;
    if btrim(coalesce(f.fa_tipopago::text, '1')) = '2' then
      if not c.aplica_credito then
        v_motivos := v_motivos || 'factura a credito y el concurso no aplica a credito'::text;
      end if;
    else
      if not c.aplica_contado then
        v_motivos := v_motivos || 'factura de contado y el concurso no aplica a contado'::text;
      end if;
      if c.solo_pagadas and upper(btrim(coalesce(f.fa_fpago, ''))) not in ('S', 'P') then
        v_motivos := v_motivos || format('la factura no esta marcada como pagada (fa_fpago = %s)', coalesce(nullif(f.fa_fpago, ''), 'vacio'));
      end if;
    end if;
    if myappdb.calcular_boletos_concurso(c, v_monto) <= 0 then
      v_motivos := v_motivos || format('el monto %s no alcanza para ningun boleto', v_monto);
    end if;

    concurso_id := c.id;
    concurso := c.nombre;
    select count(*)::integer into boletos_entregados
      from myappdb.concurso_boleto b where b.concurso_id = c.id and b.codfact = f.fa_codfact;
    boletos_que_le_tocan := myappdb.calcular_boletos_concurso(c, v_monto);
    monto_base := v_monto;
    motivo := case when cardinality(v_motivos) = 0 then 'CUMPLE: gana boletos'
                   else array_to_string(v_motivos, '; ') end;
    return next;
  end loop;
end;
$$;

revoke all on function myappdb.diagnostico_boletos_factura(text) from public;
grant execute on function myappdb.diagnostico_boletos_factura(text) to authenticated;

commit;

notify pgrst, 'reload schema';
