-- Evita que se repita salida.codsalida.
-- Primero revise si ya existen codsalida duplicados:
select codsalida, count(*) as cantidad
from myappdb.salida
where codsalida is not null
  and trim(codsalida) <> ''
group by codsalida
having count(*) > 1;

-- Si la consulta anterior devuelve filas, hay que corregir esos duplicados
-- antes de crear el indice unico.
create unique index if not exists salida_codsalida_unique
on myappdb.salida (codsalida)
where codsalida is not null
  and trim(codsalida) <> '';
