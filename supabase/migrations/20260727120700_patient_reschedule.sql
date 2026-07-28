-- =====================================================================
-- El paciente puede reagendar, no solo cancelar.
--
-- En 2.4 se le permitio unicamente cancelar: la politica exigia que todo
-- UPDATE suyo acabase en status='cancelled'. Pero el PRD dice que puede
-- reagendar ("boton Reagendar, abre modal para seleccionar nueva fecha").
--
-- Se añade una politica aparte (las politicas se combinan con OR) y se
-- relaja el trigger para dejar pasar fecha y hora. Lo que sigue congelado
-- es lo que de verdad importa: no puede cambiarse de doctor, ni de
-- servicio (y con ello de precio), ni mover la cita de otro.
--
-- La agenda del doctor sigue protegida por appointments_no_overlap: si
-- mueve la cita a un hueco ocupado, Postgres la rechaza.
-- =====================================================================

create policy "appointments_reschedule_own"
  on public.appointments
  for update
  to authenticated
  using (
    patient_id = public.current_patient_id()
    and status in ('scheduled', 'confirmed')
  )
  with check (
    patient_id = public.current_patient_id()
    and status in ('scheduled', 'confirmed')
  );

create or replace function public.guard_patient_appointment_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Admin y doctor tienen sus propias politicas; esto solo aplica al paciente
  if public.is_admin() or old.doctor_id = public.current_doctor_id() then
    return new;
  end if;

  if old.patient_id = public.current_patient_id() then
    -- appointment_date y start_time SI pueden cambiar: es reagendar.
    -- El resto no.
    if new.doctor_id        is distinct from old.doctor_id
       or new.patient_id       is distinct from old.patient_id
       or new.service_id       is distinct from old.service_id
       or new.clinic_id        is distinct from old.clinic_id
       or new.duration_minutes is distinct from old.duration_minutes
    then
      raise exception 'Un paciente solo puede cancelar o reagendar su cita';
    end if;
  end if;

  return new;
end;
$$;
