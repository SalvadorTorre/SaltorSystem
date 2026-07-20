-- Permite que todos los usuarios autenticados visualicen las cotizaciones,
-- sin exigir coincidencia de vendedor, empresa o sucursal.
-- Las politicas de INSERT, UPDATE y DELETE no se modifican.

drop policy if exists rls_select_tenant on myappdb.cotizacion;

create policy rls_select_tenant
on myappdb.cotizacion
for select
to authenticated
using (
  true
);

drop policy if exists rls_select_tenant on myappdb.detcotizacion;

create policy rls_select_tenant
on myappdb.detcotizacion
for select
to authenticated
using (
  true
);
