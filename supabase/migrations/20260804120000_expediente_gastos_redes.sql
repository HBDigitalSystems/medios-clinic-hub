-- =====================================================================
-- Expediente clinico, gastos y redes sociales
--
-- Reune cuatro cosas:
--   1. Contacto de emergencia del paciente
--   2. Archivos clinicos (estudios, analisis) en bucket PRIVADO
--   3. Gastos de la clinica, imputables a un medico o generales
--   4. Redes sociales del medico
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Contacto de emergencia del paciente
-- ---------------------------------------------------------------------
alter table public.patients
  add column if not exists emergency_name     text,
  add column if not exists emergency_phone    text,
  add column if not exists emergency_relation text;

comment on column public.patients.emergency_phone is
  'A quien llamar si le pasa algo al paciente. Lo ve el personal clinico.';

-- ---------------------------------------------------------------------
-- 2. Redes sociales del medico
-- ---------------------------------------------------------------------
alter table public.doctors
  add column if not exists facebook  text,
  add column if not exists instagram text;

-- ---------------------------------------------------------------------
-- 3. Archivos clinicos
--
-- El archivo vive en Storage; aqui solo van los metadatos y quien lo
-- subio. `storage_path` es la ruta dentro del bucket, con el id del
-- paciente como primera carpeta: de ahi cuelga el control de acceso.
-- ---------------------------------------------------------------------
create type public.file_kind as enum ('estudio', 'analisis', 'receta', 'consentimiento', 'otro');

create table public.patient_files (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null references public.clinics(id) on delete cascade,
  patient_id    uuid not null references public.patients(id) on delete cascade,
  -- Quien lo subio. Se conserva el registro aunque la cuenta desaparezca.
  uploaded_by   uuid references auth.users(id) on delete set null,
  storage_path  text not null unique,
  file_name     text not null,
  mime_type     text not null default '',
  size_bytes    bigint not null default 0,
  kind          public.file_kind not null default 'otro',
  notes         text not null default '',
  created_at    timestamptz not null default now()
);

create index patient_files_patient_idx on public.patient_files (patient_id, created_at desc);
create index patient_files_clinic_idx  on public.patient_files (clinic_id);

alter table public.patient_files enable row level security;

-- Admin: todo
create policy "patient_files_all_admin"
  on public.patient_files for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Medico: los de pacientes a los que ha atendido
create policy "patient_files_select_doctor"
  on public.patient_files for select
  to authenticated
  using (
    exists (
      select 1 from public.appointments a
       where a.patient_id = patient_files.patient_id
         and a.doctor_id = public.current_doctor_id()
    )
  );

create policy "patient_files_insert_doctor"
  on public.patient_files for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.appointments a
       where a.patient_id = patient_files.patient_id
         and a.doctor_id = public.current_doctor_id()
    )
  );

-- El medico solo puede borrar lo que subio el mismo
create policy "patient_files_delete_doctor"
  on public.patient_files for delete
  to authenticated
  using (
    uploaded_by = auth.uid()
    and public.current_doctor_id() is not null
  );

-- Paciente: ve y descarga los suyos, pero no los sube ni los borra.
-- Un expediente que el propio paciente puede alterar no vale como registro.
create policy "patient_files_select_own"
  on public.patient_files for select
  to authenticated
  using (patient_id = public.current_patient_id());

-- ---------------------------------------------------------------------
-- 4. Gastos
--
-- `doctor_id` nulo = gasto general de la clinica (alquiler, luz...).
-- Con doctor = imputable a ese medico (material, comisiones...).
-- ---------------------------------------------------------------------
create table public.expenses (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null references public.clinics(id) on delete cascade,
  -- ON DELETE SET NULL y no CASCADE: si se da de baja a un medico, el gasto
  -- ya ocurrio y no debe desaparecer de la contabilidad
  doctor_id    uuid references public.doctors(id) on delete set null,
  concept      text not null,
  amount       numeric(10, 2) not null,
  expense_date date not null default current_date,
  notes        text not null default '',
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint expenses_amount_ck check (amount >= 0),
  constraint expenses_concept_ck check (length(trim(concept)) > 0)
);

create index expenses_clinic_date_idx on public.expenses (clinic_id, expense_date desc);
create index expenses_doctor_idx      on public.expenses (doctor_id);

create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

alter table public.expenses enable row level security;

-- Los gastos son informacion de gestion: solo el admin
create policy "expenses_all_admin"
  on public.expenses for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- El medico ve los que se le imputan, para poder cuadrar sus numeros
create policy "expenses_select_own"
  on public.expenses for select
  to authenticated
  using (doctor_id = public.current_doctor_id());

-- ---------------------------------------------------------------------
-- 5. Bucket PRIVADO para los archivos clinicos
--
-- Privado, al contrario que `avatars`: un estudio medico con URL publica
-- seria accesible por cualquiera que la adivine o la reciba reenviada.
-- Se sirve con enlaces firmados y caducables.
--
-- La ruta es <patient_id>/<archivo>, y de la primera carpeta cuelga el
-- control de acceso.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'clinical-files',
  'clinical-files',
  false,
  20971520, -- 20 MB: una resonancia o un PDF de analisis pesan
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

/** Decide si quien pregunta puede tocar los archivos de ese paciente. */
create or replace function public.puede_ver_archivos_de(p_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    public.is_admin()
    or p_patient_id = public.current_patient_id()
    or exists (
      select 1 from public.appointments a
       where a.patient_id = p_patient_id
         and a.doctor_id = public.current_doctor_id()
    );
$$;

revoke execute on function public.puede_ver_archivos_de(uuid) from public;
grant execute on function public.puede_ver_archivos_de(uuid) to authenticated;

create policy "clinical_files_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'clinical-files'
    and public.puede_ver_archivos_de(((storage.foldername(name))[1])::uuid)
  );

-- Subir: admin y medicos. El paciente no sube a su propio expediente.
create policy "clinical_files_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'clinical-files'
    and (public.is_admin() or public.current_doctor_id() is not null)
    and public.puede_ver_archivos_de(((storage.foldername(name))[1])::uuid)
  );

create policy "clinical_files_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'clinical-files'
    and (public.is_admin() or public.current_doctor_id() is not null)
    and public.puede_ver_archivos_de(((storage.foldername(name))[1])::uuid)
  );
