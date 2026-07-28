-- =====================================================================
-- DoctorCita Clinica - Politicas RLS
-- Fase 2.4 del roadmap. (`profiles` ya se hizo en 2.3.)
--
-- Roles de Postgres implicados:
--   anon          -> visitante sin cuenta (landing y booking publico)
--   authenticated -> cualquiera logueado; el rol de negocio sale de
--                    public.profiles via los helpers SECURITY DEFINER
-- =====================================================================

-- ---------------------------------------------------------------------
-- clinics: lectura publica (la landing la necesita), escritura solo admin
-- ---------------------------------------------------------------------
create policy "clinics_select_public"
  on public.clinics for select
  to anon, authenticated
  using (true);

create policy "clinics_update_admin"
  on public.clinics for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "clinics_insert_admin"
  on public.clinics for insert
  to authenticated
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- services: lectura publica (landing + booking), CRUD solo admin
-- ---------------------------------------------------------------------
create policy "services_select_public"
  on public.services for select
  to anon, authenticated
  using (true);

create policy "services_all_admin"
  on public.services for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- doctors: lectura publica (landing + booking), CRUD solo admin
-- ---------------------------------------------------------------------
create policy "doctors_select_public"
  on public.doctors for select
  to anon, authenticated
  using (true);

create policy "doctors_all_admin"
  on public.doctors for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- patients
--   admin   -> CRUD completo
--   doctor  -> lectura de los pacientes de su clinica
--   paciente-> solo su propia ficha (lectura y actualizacion)
--   anon    -> puede INSERTAR (booking publico) pero nunca leer
-- ---------------------------------------------------------------------
create policy "patients_all_admin"
  on public.patients for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "patients_select_doctor"
  on public.patients for select
  to authenticated
  using (
    public.current_user_role() = 'doctor'
    and clinic_id = public.current_user_clinic_id()
  );

create policy "patients_select_own"
  on public.patients for select
  to authenticated
  using (user_id = auth.uid());

-- Puede corregir sus datos de contacto, pero no cambiarse de clinica
-- ni robar la ficha de otro (user_id se congela en el WITH CHECK).
create policy "patients_update_own"
  on public.patients for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and clinic_id = public.current_user_clinic_id()
  );

-- Booking publico: alta de paciente sin cuenta.
-- No puede autoasignarse un user_id existente.
create policy "patients_insert_public"
  on public.patients for insert
  to anon, authenticated
  with check (user_id is null);

-- ---------------------------------------------------------------------
-- appointments
--   admin   -> CRUD completo
--   doctor  -> ve, crea y actualiza las suyas
--   paciente-> ve las suyas, crea, y solo puede CANCELAR
--   anon    -> puede INSERTAR (booking publico), siempre como 'scheduled'
-- ---------------------------------------------------------------------
create policy "appointments_all_admin"
  on public.appointments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "appointments_select_doctor"
  on public.appointments for select
  to authenticated
  using (doctor_id = public.current_doctor_id());

create policy "appointments_insert_doctor"
  on public.appointments for insert
  to authenticated
  with check (doctor_id = public.current_doctor_id());

create policy "appointments_update_doctor"
  on public.appointments for update
  to authenticated
  using (doctor_id = public.current_doctor_id())
  with check (doctor_id = public.current_doctor_id());

create policy "appointments_select_own"
  on public.appointments for select
  to authenticated
  using (patient_id = public.current_patient_id());

create policy "appointments_insert_own"
  on public.appointments for insert
  to authenticated
  with check (
    patient_id = public.current_patient_id()
    and status = 'scheduled'
  );

-- Solo desde scheduled/confirmed y solo hacia cancelled.
-- El resto de columnas las congela el trigger de mas abajo.
create policy "appointments_cancel_own"
  on public.appointments for update
  to authenticated
  using (
    patient_id = public.current_patient_id()
    and status in ('scheduled', 'confirmed')
  )
  with check (
    patient_id = public.current_patient_id()
    and status = 'cancelled'
  );

create policy "appointments_insert_public"
  on public.appointments for insert
  to anon
  with check (status = 'scheduled');

-- Una politica UPDATE solo ve la fila nueva en WITH CHECK, no puede
-- comparar contra la vieja. Sin esto, un paciente podria colar cambios
-- de fecha, doctor o precio dentro de la misma operacion de "cancelar".
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
    if new.appointment_date is distinct from old.appointment_date
       or new.start_time      is distinct from old.start_time
       or new.duration_minutes is distinct from old.duration_minutes
       or new.doctor_id       is distinct from old.doctor_id
       or new.patient_id      is distinct from old.patient_id
       or new.service_id      is distinct from old.service_id
       or new.clinic_id       is distinct from old.clinic_id
    then
      raise exception 'Un paciente solo puede cambiar el estado de su cita';
    end if;
  end if;

  return new;
end;
$$;

create trigger appointments_guard_patient_update
  before update on public.appointments
  for each row execute function public.guard_patient_appointment_update();

-- ---------------------------------------------------------------------
-- appointment_notes: SOLO admin y el doctor de la cita.
-- El paciente no tiene ninguna politica, asi que no existe para el.
-- ---------------------------------------------------------------------
create policy "appointment_notes_all_admin"
  on public.appointment_notes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "appointment_notes_all_doctor"
  on public.appointment_notes for all
  to authenticated
  using (
    exists (
      select 1 from public.appointments a
       where a.id = appointment_id
         and a.doctor_id = public.current_doctor_id()
    )
  )
  with check (
    exists (
      select 1 from public.appointments a
       where a.id = appointment_id
         and a.doctor_id = public.current_doctor_id()
    )
  );

-- ---------------------------------------------------------------------
-- appointment_events: se ven si se ve la cita; doctor y paciente insertan
-- ---------------------------------------------------------------------
create policy "appointment_events_all_admin"
  on public.appointment_events for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "appointment_events_select_visible"
  on public.appointment_events for select
  to authenticated
  using (
    exists (
      select 1 from public.appointments a
       where a.id = appointment_id
         and (a.doctor_id = public.current_doctor_id()
              or a.patient_id = public.current_patient_id())
    )
  );

create policy "appointment_events_insert_visible"
  on public.appointment_events for insert
  to authenticated
  with check (
    exists (
      select 1 from public.appointments a
       where a.id = appointment_id
         and (a.doctor_id = public.current_doctor_id()
              or a.patient_id = public.current_patient_id())
    )
  );

-- El booking publico registra el evento "created"
create policy "appointment_events_insert_public"
  on public.appointment_events for insert
  to anon
  with check (type = 'created');

-- ---------------------------------------------------------------------
-- invoices
--   admin   -> CRUD completo
--   doctor  -> lee y crea los cobros de SUS citas (cobro rapido)
--   paciente-> solo lectura de los suyos
-- ---------------------------------------------------------------------
create policy "invoices_all_admin"
  on public.invoices for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "invoices_select_doctor"
  on public.invoices for select
  to authenticated
  using (
    exists (
      select 1 from public.appointments a
       where a.id = appointment_id
         and a.doctor_id = public.current_doctor_id()
    )
  );

create policy "invoices_insert_doctor"
  on public.invoices for insert
  to authenticated
  with check (
    exists (
      select 1 from public.appointments a
       where a.id = appointment_id
         and a.doctor_id = public.current_doctor_id()
    )
  );

create policy "invoices_select_own"
  on public.invoices for select
  to authenticated
  using (patient_id = public.current_patient_id());
