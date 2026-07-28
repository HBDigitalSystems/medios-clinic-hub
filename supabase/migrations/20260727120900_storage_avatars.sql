-- =====================================================================
-- Subida de imagenes de perfil (fase 3.2)
--
-- Un solo bucket publico `avatars` con subcarpetas por entidad:
--   avatars/doctors/<uuid>.jpg
--   avatars/patients/<uuid>.jpg
--   avatars/clinics/<uuid>.png
--
-- Publico porque son fotos que ya se ensenan en la landing sin sesion.
-- Escribir, en cambio, exige estar logueado.
-- =====================================================================

-- La clinica no tenia donde guardar su logo
alter table public.clinics add column if not exists logo text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Lectura publica: las fotos de doctores salen en la landing, sin sesion
create policy "avatars_select_public"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'avatars');

-- Escritura solo con sesion. El booking anonimo no sube imagenes.
create policy "avatars_insert_authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars');

create policy "avatars_update_authenticated"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars')
  with check (bucket_id = 'avatars');

create policy "avatars_delete_authenticated"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars');
