-- =====================================================================
-- Agendar exige cuenta
--
-- Hasta ahora el booking era anonimo (lo pedia el PRD original). Cambio
-- de producto: solo usuarios con sesion pueden crear citas.
--
-- Se cierra en la BASE, no solo en la interfaz. Esconder el formulario no
-- sirve de nada si las politicas siguen dejando a `anon` insertar: basta
-- con llamar a la API con la clave publica, que va en el bundle.
--
-- Lo que SIGUE siendo publico: leer clinica, servicios y doctores. El
-- landing tiene que verse sin cuenta.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Fuera las tres politicas de escritura anonima
-- ---------------------------------------------------------------------
drop policy if exists "appointments_insert_public"       on public.appointments;
drop policy if exists "appointment_events_insert_public" on public.appointment_events;
drop policy if exists "patients_insert_public"           on public.patients;

-- ---------------------------------------------------------------------
-- Un usuario con sesion crea SU ficha de paciente
--
-- Antes la ficha se creaba con user_id null (booking anonimo) y solo se
-- vinculaba al registrarse. Ahora nace ya atada a la cuenta: sin eso, un
-- usuario nuevo crearia una ficha que no podria leer, porque
-- patients_select_own filtra por user_id.
--
-- El WITH CHECK impide crear fichas a nombre de otro.
-- ---------------------------------------------------------------------
create policy "patients_insert_own"
  on public.patients
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Las funciones del booking dejan de estar abiertas a anon.
-- Revelan horarios ocupados; sin reserva anonima, nadie sin cuenta las
-- necesita.
-- ---------------------------------------------------------------------
revoke execute on function public.doctor_busy_blocks(uuid, date) from anon;
revoke execute on function public.doctor_next_slots(uuid, int, date, time, int) from anon;
