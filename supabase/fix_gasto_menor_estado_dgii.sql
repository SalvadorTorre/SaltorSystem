-- Corrige gastos menores históricos que guardaron el status técnico
-- (por ejemplo, "success") en lugar del estado fiscal devuelto por DGII.
with estados_dgii as (
  select
    gm_numero,
    coalesce(
      nullif(gm_response_json #>> '{data,data,results,0,responseXML,dgiiResponse,estado}', ''),
      nullif(gm_response_json #>> '{data,data,results,0,responseRFCE,dgiiResponse,estado}', ''),
      nullif(gm_response_json #>> '{data,data,results,0,ecfDgii,estado}', ''),
      nullif(gm_response_json #>> '{data,data,results,0,rfceDgii,estado}', ''),
      nullif(gm_response_json #>> '{data,data,results,0,ecfEstado}', ''),
      nullif(gm_response_json #>> '{data,data,results,0,rfceEstado}', '')
    ) as estado
  from myappdb.gasto_menor
  where gm_response_json is not null
)
update myappdb.gasto_menor as gasto
set
  gm_estado_dgii = estados.estado,
  updated_at = now()
from estados_dgii as estados
where gasto.gm_numero = estados.gm_numero
  and estados.estado is not null
  and gasto.gm_estado_dgii is distinct from estados.estado;
