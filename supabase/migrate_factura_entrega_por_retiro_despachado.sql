-- Marca la factura como entregada cuando ya fue despachada y la forma de entrega es retiro.
-- Tabla real en Supabase: myappdb.factura
-- Campos: fa_despacho, fa_envio, fa_entrega

create or replace function myappdb.marcar_entrega_retiro_despachado()
returns trigger
language plpgsql
as $$
begin
  if upper(trim(coalesce(new.fa_despacho, ''))) = 'S'
     and coalesce(new.fa_envio, 0) = 2 then
    new.fa_entrega := 'S';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_factura_entrega_retiro_despachado on myappdb.factura;

create trigger trg_factura_entrega_retiro_despachado
before insert or update of fa_despacho, fa_envio
on myappdb.factura
for each row
execute function myappdb.marcar_entrega_retiro_despachado();

-- Alinea los registros existentes con la misma regla del trigger.
update myappdb.factura
set fa_entrega = 'S'
where upper(trim(coalesce(fa_despacho, ''))) = 'S'
  and coalesce(fa_envio, 0) = 2
  and upper(trim(coalesce(fa_entrega, ''))) <> 'S';
