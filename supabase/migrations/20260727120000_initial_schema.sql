-- =====================================================================
-- DoctorCita Clinica - Schema inicial
-- Fase 2.2 del roadmap. 8 tablas + enums + indices + constraints.
--
-- RLS queda ACTIVADO pero SIN politicas: hasta la fase 2.4 nadie puede
-- leer ni escribir con las claves anon/authenticated. Es el default
-- seguro; una tabla expuesta sin politicas seria peor que uno sin RLS.
-- =====================================================================

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.app_role as enum ('admin', 'doctor', 'patient');

create type public.appointment_status as enum (
  'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'
);

create type public.invoice_status as enum ('pending', 'paid', 'cancelled');

create type public.payment_method as enum ('efectivo', 'tarjeta', 'transferencia');

-- ---------------------------------------------------------------------
-- updated_at automatico
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- clinics
-- ---------------------------------------------------------------------
create table public.clinics (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  address     text        not null default '',
  phone       text        not null default '',
  email       text        not null default '',
  open_time   time        not null default '09:00',
  close_time  time        not null default '19:00',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint clinics_hours_ck check (close_time > open_time)
);

create trigger clinics_set_updated_at
  before update on public.clinics
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- profiles: vincula auth.users con un rol y una clinica
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  clinic_id   uuid references public.clinics(id) on delete set null,
  role        public.app_role not null default 'patient',
  full_name   text        not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index profiles_clinic_id_idx on public.profiles (clinic_id);
create index profiles_role_idx      on public.profiles (role);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- services (especialidades)
-- ---------------------------------------------------------------------
create table public.services (
  id                uuid primary key default gen_random_uuid(),
  clinic_id         uuid not null references public.clinics(id) on delete cascade,
  name              text not null,
  duration_minutes  int  not null,
  price             numeric(10, 2) not null,
  description       text not null default '',
  icon              text not null default 'Stethoscope',
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint services_duration_ck check (duration_minutes > 0),
  constraint services_price_ck    check (price >= 0)
);

create index services_clinic_id_idx on public.services (clinic_id);

create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- doctors
-- ---------------------------------------------------------------------
create table public.doctors (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics(id) on delete cascade,
  -- Se rellena cuando la persona acepta la invitacion (fase 2.7)
  user_id     uuid unique references auth.users(id) on delete set null,
  service_id  uuid references public.services(id) on delete set null,
  name        text not null,
  photo       text not null default '',
  -- {"days":[1,2,3,4,5],"start":"09:00","end":"17:00"} -- 1=lunes .. 7=domingo
  schedule    jsonb not null default '{"days":[1,2,3,4,5],"start":"09:00","end":"17:00"}'::jsonb,
  active      boolean not null default true,
  bio         text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index doctors_clinic_id_idx  on public.doctors (clinic_id);
create index doctors_service_id_idx on public.doctors (service_id);
create index doctors_user_id_idx    on public.doctors (user_id);

create trigger doctors_set_updated_at
  before update on public.doctors
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- patients
-- ---------------------------------------------------------------------
create table public.patients (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics(id) on delete cascade,
  user_id     uuid unique references auth.users(id) on delete set null,
  name        text not null,
  phone       text not null default '',
  email       text not null default '',
  birth_date  date,
  photo       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index patients_clinic_id_idx on public.patients (clinic_id);
create index patients_user_id_idx   on public.patients (user_id);
create index patients_phone_idx     on public.patients (phone);
-- Busqueda por nombre en el tab Pacientes del admin
create index patients_name_idx      on public.patients using gin (to_tsvector('simple', name));

create trigger patients_set_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- appointments
-- ---------------------------------------------------------------------
create table public.appointments (
  id                uuid primary key default gen_random_uuid(),
  clinic_id         uuid not null references public.clinics(id) on delete cascade,
  patient_id        uuid not null references public.patients(id) on delete cascade,
  doctor_id         uuid not null references public.doctors(id) on delete cascade,
  service_id        uuid references public.services(id) on delete set null,
  appointment_date  date not null,
  start_time        time not null,
  duration_minutes  int  not null,
  status            public.appointment_status not null default 'scheduled',
  reason            text not null default '',
  -- Solo visible para doctor y admin. Nunca se expone al paciente.
  clinical_notes    text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint appointments_duration_ck check (duration_minutes > 0)
);

create index appointments_doctor_date_idx  on public.appointments (doctor_id, appointment_date);
create index appointments_patient_idx      on public.appointments (patient_id);
create index appointments_clinic_date_idx  on public.appointments (clinic_id, appointment_date);
create index appointments_status_idx       on public.appointments (status);

create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- Regla de negocio del PRD: "un doctor no puede tener dos citas simultaneas"
-- y "la duracion del servicio determina el bloque de agenda ocupado".
-- Se impone en la base, no solo en el cliente. Las canceladas y los no-show
-- liberan el horario, por eso el WHERE.
alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    doctor_id with =,
    tsrange(
      (appointment_date + start_time),
      (appointment_date + start_time + make_interval(mins => duration_minutes))
    ) with &&
  )
  where (status not in ('cancelled', 'no_show'));

-- ---------------------------------------------------------------------
-- appointment_events: historial de la cita
-- ---------------------------------------------------------------------
create table public.appointment_events (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null references public.appointments(id) on delete cascade,
  type            text not null,
  created_at      timestamptz not null default now()
);

create index appointment_events_appointment_idx
  on public.appointment_events (appointment_id, created_at);

-- ---------------------------------------------------------------------
-- invoices (cobros)
-- ---------------------------------------------------------------------
create table public.invoices (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references public.clinics(id) on delete cascade,
  appointment_id  uuid references public.appointments(id) on delete set null,
  patient_id      uuid not null references public.patients(id) on delete cascade,
  amount          numeric(10, 2) not null,
  status          public.invoice_status not null default 'pending',
  method          public.payment_method,
  paid_at         date,
  notes           text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint invoices_amount_ck check (amount >= 0),
  -- Un cobro pagado necesita metodo y fecha; uno pendiente no puede tenerlos.
  constraint invoices_paid_ck check (
    (status = 'paid' and method is not null and paid_at is not null)
    or (status <> 'paid')
  )
);

create index invoices_patient_idx     on public.invoices (patient_id);
create index invoices_appointment_idx on public.invoices (appointment_id);
create index invoices_clinic_status_idx on public.invoices (clinic_id, status);

create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- RLS activado en todo. Las politicas llegan en la fase 2.4.
-- Sin politicas, PostgREST no deja pasar nada con anon/authenticated.
-- ---------------------------------------------------------------------
alter table public.clinics            enable row level security;
alter table public.profiles           enable row level security;
alter table public.services           enable row level security;
alter table public.doctors            enable row level security;
alter table public.patients           enable row level security;
alter table public.appointments       enable row level security;
alter table public.appointment_events enable row level security;
alter table public.invoices           enable row level security;
