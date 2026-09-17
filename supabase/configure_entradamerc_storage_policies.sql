-- Políticas para el bucket privado `entradamerc`.
-- Ejecutar una vez en el SQL Editor del Supabase que aloja SaltorSystem.

alter table myappdb.entradamerc
  add column if not exists imgfactura text;

comment on column myappdb.entradamerc.imgfactura is
  'Ruta del archivo de la entrada dentro del bucket privado entradamerc.';

drop policy if exists "entradamerc_authenticated_select" on storage.objects;
drop policy if exists "entradamerc_authenticated_insert" on storage.objects;
drop policy if exists "entradamerc_authenticated_update" on storage.objects;

create policy "entradamerc_authenticated_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'entradamerc'
  and (storage.foldername(name))[1] = 'entradas'
);

create policy "entradamerc_authenticated_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'entradamerc'
  and (storage.foldername(name))[1] = 'entradas'
);

create policy "entradamerc_authenticated_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'entradamerc'
  and (storage.foldername(name))[1] = 'entradas'
)
with check (
  bucket_id = 'entradamerc'
  and (storage.foldername(name))[1] = 'entradas'
);
