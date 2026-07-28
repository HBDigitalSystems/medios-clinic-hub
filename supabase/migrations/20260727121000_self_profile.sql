-- =====================================================================
-- Cada quien edita su propio perfil (foto y bio)
--
-- Hasta ahora `doctors` solo tenia politicas de admin, asi que un doctor
-- no podia ni cambiar su foto. Se le permite editar SU ficha, pero se
-- congelan los campos que son decision de la clinica: nombre, servicio,
-- horario, estado activo y clinica.
--
-- Sin el trigger, un doctor podria ampliarse el horario o reactivarse
-- solo despues de que un admin lo desactivara.
-- =====================================================================

create policy "doctors_update_own"
  on public.doctors
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.guard_doctor_self_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- El admin puede cambiarlo todo
  if public.is_admin() then
    return new;
  end if;

  if old.user_id is not null and old.user_id = auth.uid() then
    if new.name       is distinct from old.name
       or new.service_id is distinct from old.service_id
       or new.schedule   is distinct from old.schedule
       or new.active     is distinct from old.active
       or new.clinic_id  is distinct from old.clinic_id
       or new.user_id    is distinct from old.user_id
    then
      raise exception 'Solo puedes cambiar tu foto y tu bio. El resto lo gestiona la clinica';
    end if;
  end if;

  return new;
end;
$$;

create trigger doctors_guard_self_update
  before update on public.doctors
  for each row execute function public.guard_doctor_self_update();

-- Al paciente ya se le permitia actualizar su ficha (patients_update_own),
-- pero nada le impedia cambiarse de clinica o soltar su vinculo de cuenta.
create or replace function public.guard_patient_self_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if old.user_id is not null and old.user_id = auth.uid() then
    if new.clinic_id is distinct from old.clinic_id
       or new.user_id is distinct from old.user_id
    then
      raise exception 'No puedes cambiar tu clinica ni tu vinculo de cuenta';
    end if;
  end if;

  return new;
end;
$$;

create trigger patients_guard_self_update
  before update on public.patients
  for each row execute function public.guard_patient_self_update();
