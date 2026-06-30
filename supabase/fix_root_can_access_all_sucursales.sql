-- Corrige RLS tenant: ROOT debe ver todas las empresas/sucursales.
-- No borra datos. Solo reemplaza la funcion usada por policies.

create or replace function app_private.can_access_row(
  _company text default null,
  _branch_text text default null,
  _owner_idusuario text default null,
  _owner_codusuario integer default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = myappdb, public
as $$
declare
  cu record;
  v_branch int;
  company_ok boolean;
  branch_ok boolean;
  owner_required boolean;
  owner_ok boolean;
begin
  if auth.uid() is null then
    return false;
  end if;

  select * into cu from app_private.current_usuario() limit 1;
  if cu is null then
    return false;
  end if;

  -- ROOT es operador global del sistema: no se limita por empresa ni sucursal.
  if coalesce(app_private.is_root(), false) then
    return true;
  end if;

  if _branch_text is null or btrim(_branch_text) = '' then
    v_branch := null;
  else
    v_branch := nullif(regexp_replace(_branch_text, '[^0-9]', '', 'g'), '')::int;
  end if;

  company_ok := (
    _company is null
    or btrim(_company) = ''
    or upper(coalesce(cu.cod_empre, '')) = upper(_company)
  );
  branch_ok := (v_branch is null or cu.sucursalid = v_branch);

  -- Admin: toda su empresa, sin restringir por sucursal.
  if coalesce(app_private.is_admin(), false) then
    return coalesce(company_ok, false);
  end if;

  owner_required := (
    (_owner_idusuario is not null and btrim(_owner_idusuario) <> '')
    or _owner_codusuario is not null
  );

  owner_ok := (
    (_owner_idusuario is not null and btrim(_owner_idusuario) <> '' and upper(cu.idusuario) = upper(_owner_idusuario))
    or (_owner_codusuario is not null and cu.codusuario = _owner_codusuario)
  );

  if owner_required then
    return coalesce(company_ok, false) and coalesce(branch_ok, false) and coalesce(owner_ok, false);
  end if;

  return coalesce(company_ok, false) and coalesce(branch_ok, false);
end;
$$;

revoke all on function app_private.can_access_row(text, text, text, integer) from public;
grant execute on function app_private.can_access_row(text, text, text, integer) to authenticated;
