-- =====================================================================
-- DoctorCita Clinica - Autenticacion
-- Fase 2.3 del roadmap.
--
-- Helpers para RLS + trigger que crea el perfil al registrarse.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helpers para las politicas RLS (fase 2.4)
--
-- SECURITY DEFINER a proposito: al ejecutarse como el dueno de la funcion
-- se saltan RLS, y asi una politica sobre `profiles` puede consultar
-- `profiles` sin recursion infinita.
-- `set search_path` es obligatorio en SECURITY DEFINER para que nadie
-- pueda secuestrar la resolucion de nombres.
-- ---------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_clinic_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select clinic_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Id del registro `doctors` de quien esta logueado (null si no es doctor)
create or replace function public.current_doctor_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id from public.doctors where user_id = auth.uid();
$$;

-- Id del registro `patients` de quien esta logueado (null si no es paciente)
create or replace function public.current_patient_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id from public.patients where user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- handle_new_user: crea el perfil cuando alguien se registra.
--
-- SEGURIDAD: raw_user_meta_data lo controla quien se registra, asi que
-- NO se lee el rol de ahi. Un signup publico siempre sale 'patient'.
-- El rol 'doctor' solo se concede si la invitacion apunta a un registro
-- de doctor que existe y todavia no tiene cuenta vinculada.
-- El rol 'admin' no se concede nunca por esta via: se asigna a mano.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role        public.app_role := 'patient';
  v_clinic_id   uuid;
  v_full_name   text;
  v_invite_type text;
  v_invite_id   uuid;
begin
  v_full_name := coalesce(new.raw_user_meta_data ->> 'full_name', '');

  v_invite_type := new.raw_user_meta_data ->> 'invite_type';
  begin
    v_invite_id := nullif(new.raw_user_meta_data ->> 'invite_id', '')::uuid;
  exception when invalid_text_representation then
    v_invite_id := null;
  end;

  if v_invite_type = 'doctor' and v_invite_id is not null then
    -- `user_id is null` evita que una invitacion ya usada se reutilice
    update public.doctors
       set user_id = new.id
     where id = v_invite_id
       and user_id is null
    returning clinic_id into v_clinic_id;

    if v_clinic_id is not null then
      v_role := 'doctor';
    end if;

  elsif v_invite_type = 'patient' and v_invite_id is not null then
    update public.patients
       set user_id = new.id
     where id = v_invite_id
       and user_id is null
    returning clinic_id into v_clinic_id;
  end if;

  -- Sin invitacion valida: se cuelga de la primera clinica
  if v_clinic_id is null then
    select id into v_clinic_id
      from public.clinics
     order by created_at
     limit 1;
  end if;

  insert into public.profiles (id, clinic_id, role, full_name)
  values (new.id, v_clinic_id, v_role, v_full_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
